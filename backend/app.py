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

logger = logging.getLogger(__name__)

_STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info("Argos starting up")
    yield
    logger.info("Argos shutting down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(
        title="Argos",
        description="Local-first disk space visualizer",
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url=None,
        lifespan=_lifespan,
    )

    # Per-launch auth token stored in app state.
    # The health route is exempt; all other /api routes require this token.
    app.state.auth_token = secrets.token_urlsafe(32)

    # API routes
    app.include_router(health_router, prefix="/api")

    # Serve built frontend if available (production mode)
    if _STATIC_DIR.is_dir() and (_STATIC_DIR / "index.html").exists():
        app.mount("/", StaticFiles(directory=_STATIC_DIR, html=True), name="static")

    return app
