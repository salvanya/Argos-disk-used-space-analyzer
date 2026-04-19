"""HTTP endpoints for M14 lazy scan operations.

All endpoints require the ``X-Argos-Token`` header.

Routes:
    GET    /api/scans         — summary of every cached root-level scan
    POST   /api/scan/level    — scan one folder's direct children (cache-aware)
    DELETE /api/scan/level    — invalidate a cached level (recursive by default)
    DELETE /api/scans         — wipe the entire cache
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import Response

from backend.api.dependencies import get_cache, verify_token
from backend.core.cache import ScanCache
from backend.core.models import (
    LevelInvalidateRequest,
    LevelScanRequest,
    LevelScanResult,
    ScanSummary,
)
from backend.core.scanner import DiskScanner, compute_options_hash

__all__ = ["router"]

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(verify_token)])


# ---------------------------------------------------------------------------
# GET /api/scans
# ---------------------------------------------------------------------------


@router.get("/scans", response_model=list[ScanSummary])
async def list_scans(cache: ScanCache = Depends(get_cache)) -> list[ScanSummary]:
    """Return one :class:`ScanSummary` per cached root, freshest variant only."""
    summaries: list[ScanSummary] = []
    for root_path, _scanned_at, options_hash in cache.list_roots():
        level = cache.get_level(root_path, root_path, options_hash)
        if level is None:
            continue
        summaries.append(
            ScanSummary(
                root_path=level.root_path,
                scanned_at=level.scanned_at,
                options_hash=level.options_hash,
                direct_files=level.direct_files,
                direct_folders=level.direct_folders,
                direct_bytes_known=level.direct_bytes_known,
                error_count=level.error_count,
                duration_seconds=level.duration_seconds,
            )
        )
    return summaries


@router.delete("/scans", status_code=204)
async def delete_all_scans(cache: ScanCache = Depends(get_cache)) -> Response:
    """Wipe the entire cache. Idempotent — 204 even when already empty."""
    cache.clear()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# POST /api/scan/level
# ---------------------------------------------------------------------------


@router.post("/scan/level", response_model=LevelScanResult)
async def post_scan_level(
    body: LevelScanRequest,
    cache: ScanCache = Depends(get_cache),
) -> LevelScanResult:
    """Return one folder's direct children, honouring the cache unless bypassed.

    Raises ``422`` when the target path is missing or is a file. Permission
    failures while listing the target bubble up from the scanner as a
    successful ``LevelScanResult`` with ``accessible=False`` — intentional so
    clients can render "locked" folders without special-casing exceptions.
    """
    folder_path = Path(body.path)
    root_path = Path(body.root)
    options_hash = compute_options_hash(body.options)

    if not body.force_rescan:
        cached = cache.get_level(root_path, folder_path, options_hash)
        if cached is not None:
            return cached

    try:
        result = await asyncio.to_thread(
            DiskScanner().scan_level,
            folder_path,
            body.options,
            root_path=root_path,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except NotADirectoryError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    cache.put_level(result)
    return result


# ---------------------------------------------------------------------------
# DELETE /api/scan/level
# ---------------------------------------------------------------------------


@router.delete("/scan/level", status_code=204)
async def delete_scan_level(
    body: LevelInvalidateRequest,
    cache: ScanCache = Depends(get_cache),
) -> Response:
    """Remove a cached level. ``recursive=True`` (default) also wipes descendants."""
    cache.invalidate_level(
        Path(body.root),
        Path(body.path),
        recursive=body.recursive,
    )
    return Response(status_code=204)
