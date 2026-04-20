"""System information and utility endpoints.

Endpoints:
    GET  /api/config                   — returns per-launch auth token (no auth required)
    GET  /api/system/info              — returns admin status and platform (auth required)
    GET  /api/folder-picker            — opens native OS folder dialog (auth required)
    POST /api/system/relaunch-admin    — spawn an elevated Argos process and shut down (auth required)
"""

from __future__ import annotations

import logging
import sys
import threading
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response

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


# Sentinel: ShellExecuteW return values <= 32 indicate failure.
_SHELL_EXECUTE_SUCCESS_THRESHOLD = 32


def _relaunch_as_admin() -> int:
    """Spawn an elevated copy of the current Python process via ``ShellExecuteW``.

    Returns the raw ``ShellExecuteW`` return code so the caller can distinguish
    success (> 32) from UAC decline / other errors (<= 32).  Kept as a separate
    function so tests can monkeypatch it without invoking the Windows API.
    """
    import ctypes  # noqa: PLC0415 — Windows-only import

    params = " ".join(f'"{arg}"' for arg in sys.argv)
    # ShellExecuteW(hwnd, verb, file, params, dir, show) — show=1 SW_SHOWNORMAL
    return int(ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, params, None, 1))


def _shutdown_after(delay_seconds: float, app: Any) -> None:
    """Schedule a graceful server shutdown after *delay_seconds* seconds."""

    def _stop() -> None:
        server = getattr(app.state, "uvicorn_server", None)
        if server is not None:
            server.should_exit = True
        else:  # pragma: no cover — test environment has no uvicorn server
            logger.info("No uvicorn server attached; shutdown is a no-op in tests")

    threading.Timer(delay_seconds, _stop).start()


@_authed.post("/system/relaunch-admin", status_code=202)
async def relaunch_admin(request: Request) -> Response:
    """Spawn an elevated Argos process via ``ShellExecuteW(runas)``; shut down current process.

    Responses:
        202 — elevated process spawned; current process will shut down shortly.
        403 — UAC prompt was declined.
        409 — current process is already elevated.
        501 — platform is not Windows.
    """
    if sys.platform != "win32":
        raise HTTPException(status_code=501, detail="errors.platformUnsupported")
    if is_admin():
        raise HTTPException(status_code=409, detail="errors.alreadyElevated")

    rc = _relaunch_as_admin()
    if rc <= _SHELL_EXECUTE_SUCCESS_THRESHOLD:
        logger.warning("ShellExecuteW(runas) returned %d — treating as UAC declined", rc)
        raise HTTPException(status_code=403, detail="errors.uacDeclined")

    _shutdown_after(0.5, request.app)
    return Response(status_code=202)


@_authed.get("/folder-picker", response_model=FolderPickerResponse)
async def get_folder_picker() -> FolderPickerResponse:
    """Open a native folder-picker dialog and return the selected path."""
    try:
        path = _open_folder_dialog()
    except ImportError:
        logger.warning("tkinter unavailable — folder picker not supported")
        path = None
    return FolderPickerResponse(path=path)
