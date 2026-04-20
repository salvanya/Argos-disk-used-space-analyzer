"""Integration tests for DELETE /api/scans (bulk cache clear)."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pytest
from backend.app import create_app
from backend.core.cache import ScanCache
from backend.core.models import NodeType, ScanNode, ScanResult
from fastapi import FastAPI
from httpx import ASGITransport


def _make_result(root_path: str) -> ScanResult:
    root_node = ScanNode(
        name="root",
        path=root_path,
        node_type=NodeType.folder,
        size=10,
        accessible=True,
        is_link=False,
    )
    return ScanResult(
        root=root_node,
        scanned_at=datetime.now(tz=UTC),
        duration_seconds=0.1,
        total_files=0,
        total_folders=1,
        total_size=10,
        error_count=0,
    )


@pytest.fixture()
def app(tmp_path: Path) -> FastAPI:
    os.environ["ARGOS_CACHE_DB"] = str(tmp_path / "test_cache.sqlite")
    return create_app()


@pytest.fixture()
def cache(app: FastAPI) -> ScanCache:
    return app.state.cache


@pytest.fixture()
async def authed_client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        headers={"X-Argos-Token": app.state.auth_token},
    ) as client:
        yield client


@pytest.fixture()
async def unauthed_client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


@pytest.mark.asyncio
async def test_delete_all_scans_requires_auth(unauthed_client: httpx.AsyncClient) -> None:
    resp = await unauthed_client.delete("/api/scans")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_all_scans_clears_cache(
    authed_client: httpx.AsyncClient, cache: ScanCache
) -> None:
    cache.put(_make_result("C:/one"))
    cache.put(_make_result("C:/two"))
    assert len(cache.list_roots()) == 2

    resp = await authed_client.delete("/api/scans")
    assert resp.status_code == 204
    assert resp.content == b""
    assert cache.list_roots() == []


@pytest.mark.asyncio
async def test_delete_all_scans_on_empty_cache_is_204(
    authed_client: httpx.AsyncClient,
) -> None:
    resp = await authed_client.delete("/api/scans")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_all_scans_is_idempotent(
    authed_client: httpx.AsyncClient, cache: ScanCache
) -> None:
    cache.put(_make_result("C:/one"))
    await authed_client.delete("/api/scans")
    resp = await authed_client.delete("/api/scans")
    assert resp.status_code == 204
