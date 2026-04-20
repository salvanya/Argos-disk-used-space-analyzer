"""Integration tests for HTTP scan endpoints (GET /api/scans, GET/DELETE /api/scan/{root_b64}).

All tests use ASGITransport — no network, no process boundary.
Auth token is extracted from app.state.auth_token after app creation.
"""

from __future__ import annotations

import base64
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

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _encode_root(path: str) -> str:
    """base64url-encode a root path (forward slashes, no padding)."""
    normalised = path.replace("\\", "/")
    return base64.urlsafe_b64encode(normalised.encode()).rstrip(b"=").decode()


def _make_scan_result(root_path: str) -> ScanResult:
    root_node = ScanNode(
        name="root",
        path=root_path.replace("\\", "/"),
        node_type=NodeType.folder,
        size=500,
        accessible=True,
        is_link=False,
        children=[
            ScanNode(
                name="file.txt",
                path=root_path.replace("\\", "/") + "/file.txt",
                node_type=NodeType.file,
                size=500,
                accessible=True,
                is_link=False,
            )
        ],
    )
    return ScanResult(
        root=root_node,
        scanned_at=datetime(2026, 1, 1, tzinfo=UTC),
        duration_seconds=0.1,
        total_files=1,
        total_folders=1,
        total_size=500,
        error_count=0,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def app(tmp_path: Path) -> FastAPI:
    """Fresh app instance with a temporary SQLite cache."""
    os.environ["ARGOS_CACHE_DB"] = str(tmp_path / "test_cache.sqlite")
    return create_app()


@pytest.fixture()
def auth_token(app: FastAPI) -> str:
    return app.state.auth_token


@pytest.fixture()
async def authed_client(app: FastAPI, auth_token: str) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        headers={"X-Argos-Token": auth_token},
    ) as client:
        yield client


@pytest.fixture()
async def unauthed_client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


@pytest.fixture()
def cache(app: FastAPI) -> ScanCache:
    return app.state.cache


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_auth_missing_token_on_list(unauthed_client: httpx.AsyncClient) -> None:
    resp = await unauthed_client.get("/api/scans")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_wrong_token_on_list(app: FastAPI) -> None:
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        headers={"X-Argos-Token": "definitely-wrong"},
    ) as client:
        resp = await client.get("/api/scans")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_missing_token_on_get(unauthed_client: httpx.AsyncClient) -> None:
    b64 = _encode_root("C:/some/path")
    resp = await unauthed_client.get(f"/api/scan/{b64}")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_missing_token_on_delete(unauthed_client: httpx.AsyncClient) -> None:
    b64 = _encode_root("C:/some/path")
    resp = await unauthed_client.delete(f"/api/scan/{b64}")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/scans
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_scans_empty(authed_client: httpx.AsyncClient) -> None:
    resp = await authed_client.get("/api/scans")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_scans_with_entries(authed_client: httpx.AsyncClient, cache: ScanCache) -> None:
    result = _make_scan_result("C:/Users/test")
    cache.put(result)

    resp = await authed_client.get("/api/scans")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["root_path"] == "C:/Users/test"
    assert data[0]["total_files"] == 1
    assert data[0]["total_size"] == 500


# ---------------------------------------------------------------------------
# GET /api/scan/{root_b64}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_scan_cached(authed_client: httpx.AsyncClient, cache: ScanCache) -> None:
    result = _make_scan_result("C:/Users/test")
    cache.put(result)
    b64 = _encode_root("C:/Users/test")

    resp = await authed_client.get(f"/api/scan/{b64}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_files"] == 1
    assert data["total_size"] == 500
    assert data["root"]["path"] == "C:/Users/test"


@pytest.mark.asyncio
async def test_get_scan_not_found(authed_client: httpx.AsyncClient) -> None:
    b64 = _encode_root("C:/does/not/exist")
    resp = await authed_client.get(f"/api/scan/{b64}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_scan_bad_b64(authed_client: httpx.AsyncClient) -> None:
    resp = await authed_client.get("/api/scan/!!!not-valid-base64!!!")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# DELETE /api/scan/{root_b64}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_scan_existing(authed_client: httpx.AsyncClient, cache: ScanCache) -> None:
    result = _make_scan_result("C:/Users/test")
    cache.put(result)
    b64 = _encode_root("C:/Users/test")

    resp = await authed_client.delete(f"/api/scan/{b64}")
    assert resp.status_code == 204

    # Subsequent GET must 404
    resp2 = await authed_client.get(f"/api/scan/{b64}")
    assert resp2.status_code == 404


@pytest.mark.asyncio
async def test_delete_scan_nonexistent_is_idempotent(
    authed_client: httpx.AsyncClient,
) -> None:
    b64 = _encode_root("C:/never/existed")
    resp = await authed_client.delete(f"/api/scan/{b64}")
    assert resp.status_code == 204
