"""Shared FastAPI dependencies for Argos API routes."""

from __future__ import annotations

from fastapi import Header, HTTPException, Request

from backend.core.cache import ScanCache


async def verify_token(
    request: Request,
    x_argos_token: str | None = Header(default=None),
) -> None:
    """Dependency that enforces per-launch token authentication.

    Raises 401 if the token is missing or does not match ``app.state.auth_token``.
    """
    expected: str = request.app.state.auth_token
    if x_argos_token != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing auth token")


def get_cache(request: Request) -> ScanCache:
    """Return the application-scoped :class:`~backend.core.cache.ScanCache` instance."""
    cache: ScanCache = request.app.state.cache
    return cache
