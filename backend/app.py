"""FastAPI application factory for Argos."""

from __future__ import annotations

import logging
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.api.health import router as health_router
from backend.api.scan import router as scan_router
from backend.api.scan import ws_router
from backend.config import Settings
from backend.core.cache import ScanCache

logger = logging.getLogger(__name__)

_STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info("Argos starting up")
    yield
    logger.info("Argos shutting down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    # Read settings fresh on each call so tests using different ARGOS_* env vars
    # each get their own isolated configuration.
    settings = Settings()

    app = FastAPI(
        title="Argos",
        description="Local-first disk space visualizer",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url=None,
        lifespan=_lifespan,
    )

    # Per-launch auth token — set before any request is handled.
    app.state.auth_token = secrets.token_urlsafe(32)

    # Cache initialised eagerly so fixtures and request handlers can access it
    # via app.state.cache immediately, without waiting for the ASGI lifespan.
    app.state.cache = ScanCache(Path(settings.cache_db))

    # API routes
    app.include_router(health_router, prefix="/api")
    app.include_router(scan_router, prefix="/api")
    app.include_router(ws_router)

    # Serve built frontend if available (production mode)
    if _STATIC_DIR.is_dir() and (_STATIC_DIR / "index.html").exists():
        app.mount("/", StaticFiles(directory=_STATIC_DIR, html=True), name="static")

    return app
