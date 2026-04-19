"""Integration tests for DELETE /api/scans (bulk cache clear) under M14 semantics."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pytest
from backend.app import create_app
from backend.core.cache import ScanCache
from backend.core.models import LevelScanResult, ScanOptions
from backend.core.scanner import compute_options_hash
from fastapi import FastAPI
from httpx import ASGITransport


def _make_level(root_path: str) -> LevelScanResult:
    options_hash = compute_options_hash(ScanOptions())
    return LevelScanResult(
        root_path=root_path,
        folder_path=root_path,
        scanned_at=datetime.now(tz=UTC),
        duration_seconds=0.01,
        accessible=True,
        is_link=False,
        direct_files=0,
        direct_folders=0,
        direct_bytes_known=0,
        error_count=0,
        children=[],
        options_hash=options_hash,
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
    cache.put_level(_make_level("C:/one"))
    cache.put_level(_make_level("C:/two"))
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
    cache.put_level(_make_level("C:/one"))
    await authed_client.delete("/api/scans")
    resp = await authed_client.delete("/api/scans")
    assert resp.status_code == 204
