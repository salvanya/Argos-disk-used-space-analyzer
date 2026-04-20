"""Filesystem operation endpoints — open in Explorer and delete items.

Endpoints (all require X-Argos-Token header):
    POST   /api/fs/open    — open a path in Windows Explorer
    DELETE /api/fs/item    — delete a path (Recycle Bin or permanent)
"""

from __future__ import annotations

import asyncio
import logging
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from send2trash import send2trash  # type: ignore[import-untyped]
from starlette.responses import Response

from backend.api.dependencies import verify_token
from backend.core.models import DeleteRequest, OpenRequest
from backend.core.windows_utils import open_in_explorer

__all__ = ["router"]

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(verify_token)])


@router.post("/fs/open", status_code=204)
async def open_in_explorer_endpoint(body: OpenRequest) -> Response:
    """Open *body.path* in Windows Explorer with the item selected."""
    try:
        open_in_explorer(Path(body.path))
    except OSError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return Response(status_code=204)


@router.delete("/fs/item", status_code=204)
async def delete_item(body: DeleteRequest) -> Response:
    """Delete *body.path*, moving it to the Recycle Bin unless *body.permanent* is True.

    *body.confirm* must be ``True``; the endpoint returns 422 otherwise.
    """
    if not body.confirm:
        raise HTTPException(status_code=422, detail="confirm must be true")

    path = Path(body.path)
    logger.info("Deleting %r permanent=%s", str(path), body.permanent)

    def _do_delete() -> None:
        if body.permanent:
            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink()
        else:
            send2trash(str(path))

    try:
        await asyncio.get_event_loop().run_in_executor(None, _do_delete)
    except OSError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(status_code=204)
