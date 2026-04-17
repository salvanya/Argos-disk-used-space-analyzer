"""HTTP and WebSocket endpoints for scan operations.

HTTP endpoints (all require X-Argos-Token header):
    GET  /api/scans               — list all cached scan summaries
    GET  /api/scan/{root_b64}     — retrieve a cached ScanResult
    DELETE /api/scan/{root_b64}   — evict a cached scan

WebSocket endpoint (token passed in first JSON message):
    WS /ws/scan                   — stream scan progress, then return result

``root_b64`` is the root path base64url-encoded (forward slashes, no padding).
"""

from __future__ import annotations

import asyncio
import base64
import binascii
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from starlette.responses import Response

from backend.api.dependencies import get_cache, verify_token
from backend.core.cache import ScanCache
from backend.core.models import (
    ScanOptions,
    ScanResult,
    ScanSummary,
    WsCompleteMessage,
    WsErrorMessage,
    WsProgressMessage,
)
from backend.core.scanner import DiskScanner

__all__ = ["router", "ws_router"]

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(verify_token)])
ws_router = APIRouter()


# ---------------------------------------------------------------------------
# Path encoding helpers
# ---------------------------------------------------------------------------


def _decode_root_b64(root_b64: str) -> Path:
    """Decode a base64url root path.  Raises ``HTTPException(422)`` on failure."""
    padding = 4 - len(root_b64) % 4
    padded = root_b64 + ("=" * (padding % 4))
    try:
        decoded = base64.urlsafe_b64decode(padded).decode()
    except (binascii.Error, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid root_b64 encoding: {exc}") from exc
    return Path(decoded)


# ---------------------------------------------------------------------------
# HTTP endpoints
# ---------------------------------------------------------------------------


@router.get("/scans", response_model=list[ScanSummary])
async def list_scans(cache: ScanCache = Depends(get_cache)) -> list[ScanSummary]:
    """Return a summary of every cached scan, most-recently-scanned first."""
    rows = cache.list_roots()
    summaries: list[ScanSummary] = []
    for root_path, _scanned_at in rows:
        result = cache.get(Path(root_path))
        if result is None:
            continue
        summaries.append(
            ScanSummary(
                root_path=result.root.path,
                scanned_at=result.scanned_at,
                total_files=result.total_files,
                total_folders=result.total_folders,
                total_size=result.total_size,
                error_count=result.error_count,
                duration_seconds=result.duration_seconds,
            )
        )
    return summaries


@router.get("/scan/{root_b64}", response_model=ScanResult)
async def get_scan(
    root_b64: str,
    cache: ScanCache = Depends(get_cache),
) -> ScanResult:
    """Return the cached scan for *root_b64*, or 404 if not cached."""
    root = _decode_root_b64(root_b64)
    result = cache.get(root)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No cached scan for {root.as_posix()!r}")
    return result


@router.delete("/scan/{root_b64}", status_code=204)
async def delete_scan(
    root_b64: str,
    cache: ScanCache = Depends(get_cache),
) -> Response:
    """Evict the cached scan for *root_b64*.  Idempotent — 204 even if not present."""
    root = _decode_root_b64(root_b64)
    cache.delete(root)
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# WebSocket helpers
# ---------------------------------------------------------------------------


async def _ws_send_error(websocket: WebSocket, message: str) -> None:
    """Send an error message and close the WebSocket."""
    await websocket.send_text(WsErrorMessage(message=message).model_dump_json())
    await websocket.close()


async def _stream_scan(
    websocket: WebSocket,
    cache: ScanCache,
    root: Path,
    options: ScanOptions,
) -> None:
    """Run DiskScanner in a thread pool, stream progress, cache and return result."""
    loop = asyncio.get_event_loop()
    progress_queue: asyncio.Queue[int | None] = asyncio.Queue()

    def _progress_callback(node_count: int) -> None:
        loop.call_soon_threadsafe(progress_queue.put_nowait, node_count)

    scan_future = loop.run_in_executor(None, DiskScanner().scan, root, options, _progress_callback)

    async def _drain_progress() -> None:
        while True:
            item = await progress_queue.get()
            if item is None:
                break
            await websocket.send_text(WsProgressMessage(node_count=item).model_dump_json())

    drain_task = asyncio.create_task(_drain_progress())

    result: ScanResult | None = None
    scan_error: Exception | None = None
    try:
        result = await scan_future
    except Exception as exc:
        scan_error = exc
    finally:
        loop.call_soon_threadsafe(progress_queue.put_nowait, None)
        await drain_task

    if scan_error is not None:
        await _ws_send_error(websocket, f"Scan failed: {scan_error}")
        return

    assert result is not None
    cache.put(result)
    await websocket.send_text(WsCompleteMessage(result=result).model_dump_json())
    await websocket.close()


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------


@ws_router.websocket("/ws/scan")
async def ws_scan(websocket: WebSocket) -> None:
    """Stream scan progress and return the final result over a WebSocket.

    Protocol:
        1. Client connects and sends a JSON object:
               {"token": "<auth_token>", "root": "<path>",
                "options": {...}, "force_rescan": false}
        2. Server validates the token; on failure sends an error message and closes.
        3. If ``force_rescan`` is false and a cached result exists, the server
           immediately sends a ``complete`` message and closes.
        4. Otherwise the scan runs in a thread-pool executor.  Progress ticks
           (``{"type": "progress", "node_count": N}``) are streamed to the client.
        5. On completion a ``complete`` message is sent and the result is cached.
        6. On failure an ``error`` message is sent.
    """
    await websocket.accept()
    cache: ScanCache = websocket.app.state.cache

    try:
        payload = await websocket.receive_json()
    except WebSocketDisconnect:
        return

    # Auth check
    token: str | None = payload.get("token")
    if token != websocket.app.state.auth_token:
        await _ws_send_error(websocket, "Invalid or missing auth token")
        return

    root_str: str | None = payload.get("root")
    if not root_str:
        await _ws_send_error(websocket, "Missing required field: root")
        return

    root = Path(root_str)
    options = ScanOptions(**payload.get("options", {}))
    force_rescan: bool = bool(payload.get("force_rescan", False))

    # Validate root exists (blocking stat — cheap, intentional)
    root_exists = await asyncio.get_event_loop().run_in_executor(None, root.exists)
    if not root_exists:
        await _ws_send_error(websocket, f"Root path does not exist: {root}")
        return

    # Serve from cache if available and not forcing a rescan
    if not force_rescan:
        cached = cache.get(root)
        if cached is not None:
            await websocket.send_text(WsCompleteMessage(result=cached).model_dump_json())
            await websocket.close()
            return

    await _stream_scan(websocket, cache, root, options)
