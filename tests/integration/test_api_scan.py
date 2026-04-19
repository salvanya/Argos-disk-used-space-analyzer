"""Integration tests for HTTP scan endpoints (M14 lazy scanning).

HTTP surface under test:
    GET    /api/scans             — list every cached root-level summary
    POST   /api/scan/level        — scan or serve one folder's direct children
    DELETE /api/scan/level        — invalidate one (or one + descendants)
    DELETE /api/scans             — wipe the entire cache

All tests use ASGITransport — no network, no process boundary.
Auth token is extracted from ``app.state.auth_token`` after app creation.
"""

from __future__ import annotations

import asyncio
import base64
import os
from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
from backend.app import create_app
from backend.core.cache import ScanCache
from backend.core.models import ScanOptions
from backend.core.scanner import compute_options_hash
from fastapi import FastAPI
from httpx import ASGITransport
from starlette.testclient import TestClient

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def app(tmp_path: Path) -> FastAPI:
    """Fresh app with an isolated SQLite cache per test."""
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


@pytest.fixture()
def sample_tree(tmp_path: Path) -> Path:
    """Return a small filesystem fixture with known sizes."""
    root = tmp_path / "sample"
    root.mkdir()
    (root / "a.txt").write_bytes(b"x" * 100)
    (root / "b.txt").write_bytes(b"x" * 200)
    sub = root / "sub"
    sub.mkdir()
    (sub / "c.txt").write_bytes(b"x" * 50)
    return root


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_auth_missing_token_on_list(unauthed_client: httpx.AsyncClient) -> None:
    resp = await unauthed_client.get("/api/scans")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_missing_token_on_post_scan_level(
    unauthed_client: httpx.AsyncClient, sample_tree: Path
) -> None:
    resp = await unauthed_client.post(
        "/api/scan/level",
        json={"root": sample_tree.as_posix(), "path": sample_tree.as_posix()},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_missing_token_on_delete_scan_level(
    unauthed_client: httpx.AsyncClient, sample_tree: Path
) -> None:
    resp = await unauthed_client.request(
        "DELETE",
        "/api/scan/level",
        json={"root": sample_tree.as_posix(), "path": sample_tree.as_posix()},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/scan/level — happy paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_scan_level_happy_path(
    authed_client: httpx.AsyncClient, sample_tree: Path
) -> None:
    resp = await authed_client.post(
        "/api/scan/level",
        json={"root": sample_tree.as_posix(), "path": sample_tree.as_posix()},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["root_path"] == sample_tree.as_posix()
    assert data["folder_path"] == sample_tree.as_posix()
    assert data["accessible"] is True
    assert data["direct_files"] == 2
    assert data["direct_folders"] == 1
    assert data["direct_bytes_known"] == 300
    assert data["error_count"] == 0
    names = {c["name"] for c in data["children"]}
    assert names == {"a.txt", "b.txt", "sub"}


@pytest.mark.asyncio
async def test_post_scan_level_uses_cache_on_repeat(
    authed_client: httpx.AsyncClient, sample_tree: Path
) -> None:
    first = await authed_client.post(
        "/api/scan/level",
        json={"root": sample_tree.as_posix(), "path": sample_tree.as_posix()},
    )
    second = await authed_client.post(
        "/api/scan/level",
        json={"root": sample_tree.as_posix(), "path": sample_tree.as_posix()},
    )
    assert first.status_code == 200
    assert second.status_code == 200
    # scanned_at identical proves the second call served the cached row.
    assert first.json()["scanned_at"] == second.json()["scanned_at"]


@pytest.mark.asyncio
async def test_post_scan_level_force_rescan_bypasses_cache(
    authed_client: httpx.AsyncClient, sample_tree: Path
) -> None:
    first = await authed_client.post(
        "/api/scan/level",
        json={"root": sample_tree.as_posix(), "path": sample_tree.as_posix()},
    )
    # Give the clock a beat so ``scanned_at`` strings can diverge.
    await asyncio.sleep(0.01)
    second = await authed_client.post(
        "/api/scan/level",
        json={
            "root": sample_tree.as_posix(),
            "path": sample_tree.as_posix(),
            "force_rescan": True,
        },
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["scanned_at"] != second.json()["scanned_at"]


@pytest.mark.asyncio
async def test_post_scan_level_options_affect_cache_key(
    authed_client: httpx.AsyncClient, sample_tree: Path
) -> None:
    """Same root+folder under different ScanOptions are cached separately."""
    base = {"root": sample_tree.as_posix(), "path": sample_tree.as_posix()}
    r_default = await authed_client.post("/api/scan/level", json=base)
    r_hidden = await authed_client.post(
        "/api/scan/level",
        json={**base, "options": {"include_hidden": True}},
    )
    assert r_default.status_code == 200
    assert r_hidden.status_code == 200
    assert r_default.json()["options_hash"] != r_hidden.json()["options_hash"]


@pytest.mark.asyncio
async def test_post_scan_level_with_explicit_root_records_correctly(
    authed_client: httpx.AsyncClient, sample_tree: Path
) -> None:
    sub = sample_tree / "sub"
    resp = await authed_client.post(
        "/api/scan/level",
        json={"root": sample_tree.as_posix(), "path": sub.as_posix()},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["root_path"] == sample_tree.as_posix()
    assert data["folder_path"] == sub.as_posix()
    assert data["direct_files"] == 1
    assert data["direct_bytes_known"] == 50


# ---------------------------------------------------------------------------
# POST /api/scan/level — 422 cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_scan_level_invalid_path_returns_422(
    authed_client: httpx.AsyncClient, tmp_path: Path
) -> None:
    missing = tmp_path / "definitely_not_there"
    resp = await authed_client.post(
        "/api/scan/level",
        json={"root": missing.as_posix(), "path": missing.as_posix()},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_post_scan_level_on_file_path_returns_422(
    authed_client: httpx.AsyncClient, tmp_path: Path
) -> None:
    f = tmp_path / "not_a_dir.txt"
    f.write_bytes(b"x" * 10)
    resp = await authed_client.post(
        "/api/scan/level",
        json={"root": tmp_path.as_posix(), "path": f.as_posix()},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_post_scan_level_permission_denied_returns_200_accessible_false(
    authed_client: httpx.AsyncClient,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """os.scandir raising PermissionError on the target → 200 with accessible=False."""
    secret = tmp_path / "secret"
    secret.mkdir()
    (secret / "inside.txt").write_bytes(b"x" * 99)

    _real_scandir = os.scandir

    def _patched(path: str | Path | os.PathLike[str]) -> os.ScandirIterator:  # type: ignore[type-arg]
        if str(Path(path)) == str(secret):
            raise PermissionError(f"Access denied: {path}")
        return _real_scandir(path)

    monkeypatch.setattr(os, "scandir", _patched)

    resp = await authed_client.post(
        "/api/scan/level",
        json={"root": tmp_path.as_posix(), "path": secret.as_posix()},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["accessible"] is False
    assert data["children"] == []


# ---------------------------------------------------------------------------
# DELETE /api/scan/level
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_scan_level_recursive_removes_descendants(
    authed_client: httpx.AsyncClient, sample_tree: Path, cache: ScanCache
) -> None:
    root = sample_tree.as_posix()
    sub = (sample_tree / "sub").as_posix()

    # Seed cache by scanning both levels.
    await authed_client.post("/api/scan/level", json={"root": root, "path": root})
    await authed_client.post("/api/scan/level", json={"root": root, "path": sub})

    resp = await authed_client.request(
        "DELETE",
        "/api/scan/level",
        json={"root": root, "path": root, "recursive": True},
    )
    assert resp.status_code == 204

    h = compute_options_hash(ScanOptions())
    assert cache.get_level(root, root, h) is None
    assert cache.get_level(root, sub, h) is None


@pytest.mark.asyncio
async def test_delete_scan_level_non_recursive_keeps_descendants(
    authed_client: httpx.AsyncClient, sample_tree: Path, cache: ScanCache
) -> None:
    root = sample_tree.as_posix()
    sub = (sample_tree / "sub").as_posix()

    await authed_client.post("/api/scan/level", json={"root": root, "path": root})
    await authed_client.post("/api/scan/level", json={"root": root, "path": sub})

    resp = await authed_client.request(
        "DELETE",
        "/api/scan/level",
        json={"root": root, "path": root, "recursive": False},
    )
    assert resp.status_code == 204

    h = compute_options_hash(ScanOptions())
    assert cache.get_level(root, root, h) is None
    # Descendant row survives.
    assert cache.get_level(root, sub, h) is not None


@pytest.mark.asyncio
async def test_delete_scan_level_defaults_to_recursive(
    authed_client: httpx.AsyncClient, sample_tree: Path, cache: ScanCache
) -> None:
    root = sample_tree.as_posix()
    sub = (sample_tree / "sub").as_posix()

    await authed_client.post("/api/scan/level", json={"root": root, "path": root})
    await authed_client.post("/api/scan/level", json={"root": root, "path": sub})

    # No recursive flag → default True per LevelInvalidateRequest.
    resp = await authed_client.request(
        "DELETE",
        "/api/scan/level",
        json={"root": root, "path": root},
    )
    assert resp.status_code == 204

    h = compute_options_hash(ScanOptions())
    assert cache.get_level(root, sub, h) is None


@pytest.mark.asyncio
async def test_delete_scan_level_missing_is_idempotent(
    authed_client: httpx.AsyncClient, tmp_path: Path
) -> None:
    resp = await authed_client.request(
        "DELETE",
        "/api/scan/level",
        json={"root": tmp_path.as_posix(), "path": tmp_path.as_posix()},
    )
    assert resp.status_code == 204


# ---------------------------------------------------------------------------
# GET /api/scans — now returns only root-level summaries
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_scans_empty(authed_client: httpx.AsyncClient) -> None:
    resp = await authed_client.get("/api/scans")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_scans_only_returns_root_level_summaries(
    authed_client: httpx.AsyncClient, sample_tree: Path
) -> None:
    root = sample_tree.as_posix()
    sub = (sample_tree / "sub").as_posix()

    await authed_client.post("/api/scan/level", json={"root": root, "path": root})
    await authed_client.post("/api/scan/level", json={"root": root, "path": sub})

    resp = await authed_client.get("/api/scans")
    assert resp.status_code == 200
    data = resp.json()
    # Only one entry — for the root level.
    assert len(data) == 1
    summary = data[0]
    assert summary["root_path"] == root
    assert summary["direct_files"] == 2
    assert summary["direct_folders"] == 1
    assert summary["direct_bytes_known"] == 300


@pytest.mark.asyncio
async def test_get_scans_dedupes_across_options(
    authed_client: httpx.AsyncClient, sample_tree: Path
) -> None:
    """Same root under multiple option sets → only the freshest summary."""
    root = sample_tree.as_posix()
    await authed_client.post("/api/scan/level", json={"root": root, "path": root})
    await asyncio.sleep(0.01)
    await authed_client.post(
        "/api/scan/level",
        json={"root": root, "path": root, "options": {"include_hidden": True}},
    )
    resp = await authed_client.get("/api/scans")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    # The hidden-included variant is the freshest.
    expected_hash = compute_options_hash(ScanOptions(include_hidden=True))
    assert data[0]["options_hash"] == expected_hash


# ---------------------------------------------------------------------------
# Legacy routes — deleted
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_legacy_get_scan_b64_is_gone(authed_client: httpx.AsyncClient) -> None:
    """``GET /api/scan/<b64>`` no longer returns a ScanResult.

    The old handler would return 200 with a ScanResult JSON body or 404 with
    ``{"detail": "No cached scan..."}``. With the route deleted, the static
    catch-all answers 404 with ``{"detail": "Not Found"}`` instead.
    """
    b64 = base64.urlsafe_b64encode(b"C:/anywhere").rstrip(b"=").decode()
    resp = await authed_client.get(f"/api/scan/{b64}")
    assert resp.status_code == 404
    # Make sure it's the catch-all's "Not Found", not the legacy handler's 404.
    assert "No cached scan" not in resp.text


@pytest.mark.asyncio
async def test_legacy_delete_scan_b64_is_gone(authed_client: httpx.AsyncClient) -> None:
    """The old idempotent 204 handler is gone — static catch-all now replies."""
    b64 = base64.urlsafe_b64encode(b"C:/anywhere").rstrip(b"=").decode()
    resp = await authed_client.delete(f"/api/scan/{b64}")
    assert resp.status_code != 204


@pytest.mark.asyncio
async def test_legacy_ws_scan_is_gone(app: FastAPI) -> None:
    """The /ws/scan WebSocket route has been removed; connecting must fail."""
    with (
        TestClient(app) as client,
        pytest.raises(Exception),  # noqa: B017
        client.websocket_connect("/ws/scan"),
    ):
        pass
