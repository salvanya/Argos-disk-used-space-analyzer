"""Shared pytest fixtures for Argos tests."""

from __future__ import annotations

import httpx
import pytest
from backend.app import create_app
from fastapi import FastAPI
from httpx import ASGITransport


@pytest.fixture()
def app() -> FastAPI:
    """Create a fresh FastAPI app instance for testing (no browser, no Uvicorn)."""
    return create_app()


@pytest.fixture()
async def async_client(app: FastAPI) -> httpx.AsyncClient:
    """Async HTTP client wired directly to the FastAPI app (no network)."""
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        yield client
