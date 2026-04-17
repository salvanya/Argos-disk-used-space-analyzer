"""Health check endpoint.

Intentionally unauthenticated so the browser can verify the server is up
before it has received the auth token.
"""

from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

_FALLBACK_VERSION = "0.1.0"


def _get_version() -> str:
    try:
        return version("argos")
    except PackageNotFoundError:
        return _FALLBACK_VERSION


class HealthResponse(BaseModel):
    status: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=_get_version())
