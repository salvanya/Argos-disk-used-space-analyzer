"""System information and utility endpoints.

Endpoints:
    GET /api/config         — returns per-launch auth token (no auth required)
    GET /api/system/info    — returns admin status and platform (auth required)
    GET /api/folder-picker  — opens native OS folder dialog (auth required)
"""

from __future__ import annotations

import logging
import sys

from fastapi import APIRouter, Depends, Request

from backend.api.dependencies import verify_token
from backend.core.models import AppConfig, FolderPickerResponse, SystemInfo
from backend.core.windows_utils import is_admin

__all__ = ["router"]

logger = logging.getLogger(__name__)

router = APIRouter()
_authed = APIRouter(dependencies=[Depends(verify_token)])


def _open_folder_dialog() -> str | None:
    """Open a native OS folder-picker dialog via tkinter and return the selected path.

    Returns None if the user cancels or tkinter is unavailable.
    """
    import tkinter as tk  # noqa: PLC0415
    from tkinter import filedialog  # noqa: PLC0415

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    selected: str = filedialog.askdirectory(parent=root)
    root.destroy()
    return selected if selected else None


# ---------------------------------------------------------------------------
# Unauthenticated bootstrap endpoint
# ---------------------------------------------------------------------------


@router.get("/config", response_model=AppConfig)
async def get_config(request: Request) -> AppConfig:
    """Return the per-launch auth token so the frontend can bootstrap."""
    return AppConfig(token=request.app.state.auth_token)


# ---------------------------------------------------------------------------
# Authenticated endpoints
# ---------------------------------------------------------------------------


@_authed.get("/system/info", response_model=SystemInfo)
async def get_system_info() -> SystemInfo:
    """Return admin status and platform string."""
    return SystemInfo(is_admin=is_admin(), platform=sys.platform)


@_authed.get("/folder-picker", response_model=FolderPickerResponse)
async def get_folder_picker() -> FolderPickerResponse:
    """Open a native folder-picker dialog and return the selected path."""
    try:
        path = _open_folder_dialog()
    except ImportError:
        logger.warning("tkinter unavailable — folder picker not supported")
        path = None
    return FolderPickerResponse(path=path)
