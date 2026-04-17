"""Integration tests for GET /api/health."""

from __future__ import annotations

import httpx
import pytest


@pytest.mark.asyncio
async def test_health_returns_200(async_client: httpx.AsyncClient) -> None:
    response = await async_client.get("/api/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_body_has_status_ok(async_client: httpx.AsyncClient) -> None:
    response = await async_client.get("/api/health")
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_health_body_has_version(async_client: httpx.AsyncClient) -> None:
    response = await async_client.get("/api/health")
    data = response.json()
    assert "version" in data
    assert isinstance(data["version"], str)
    assert len(data["version"]) > 0


@pytest.mark.asyncio
async def test_health_no_token_required(async_client: httpx.AsyncClient) -> None:
    """Health endpoint must be reachable without an auth token."""
    response = await async_client.get("/api/health")
    # Must NOT be 401 or 403
    assert response.status_code not in (401, 403)
