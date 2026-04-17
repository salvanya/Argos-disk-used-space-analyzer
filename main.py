"""Argos entry point.

Run with: ``python main.py``

Starts a FastAPI/Uvicorn server on 127.0.0.1 (random free port by default),
generates a per-launch auth token, and opens the browser at the correct URL.
"""

from __future__ import annotations

import contextlib
import logging
import socket
import sys
import webbrowser
from pathlib import Path

import uvicorn
from backend.app import create_app
from backend.config import Settings

logger = logging.getLogger("argos")


def _find_free_port(host: str, preferred: int) -> int:
    """Return a free TCP port on *host*.

    If *preferred* is non-zero, attempt to use it; fall back to OS selection.
    Falls back to 8765 if port 0 binding fails for any reason.
    """
    if preferred != 0:
        return preferred
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind((host, 0))
            return sock.getsockname()[1]
    except OSError:
        return 8765


def _configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%H:%M:%S",
    )


def main() -> int:
    """Entry point. Returns the process exit code."""
    settings = Settings()
    _configure_logging(settings.log_level)

    app = create_app()
    port = _find_free_port(settings.host, settings.port)
    token = app.state.auth_token

    # In dev mode, open the Vite dev server (port 5173) not the backend.
    dev_mode = settings.dev or not (Path("backend/static/index.html")).exists()

    if dev_mode:
        frontend_url = f"http://localhost:5173/?token={token}"
        logger.info("Dev mode — open the Vite dev server at %s", frontend_url)
    else:
        frontend_url = f"http://{settings.host}:{port}/?token={token}"

    logger.info("Starting Argos on http://%s:%d", settings.host, port)

    if settings.auto_open_browser and not dev_mode:
        webbrowser.open(frontend_url)

    with contextlib.suppress(KeyboardInterrupt):
        uvicorn.run(
            app,
            host=settings.host,
            port=port,
            log_level=settings.log_level.lower(),
            access_log=False,
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
