"""Unit tests for POST /api/fs/open and DELETE /api/fs/item endpoints."""

from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path
from unittest.mock import MagicMock, patch

import httpx
import pytest
from backend.app import create_app
from fastapi import FastAPI
from httpx import ASGITransport

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def app() -> FastAPI:
    return create_app()


@pytest.fixture()
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as c:
        yield c


@pytest.fixture()
def token(app: FastAPI) -> str:
    return app.state.auth_token  # type: ignore[no-any-return]


# ---------------------------------------------------------------------------
# POST /api/fs/open — auth
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_open_requires_token(client: httpx.AsyncClient, tmp_path: Path) -> None:
    resp = await client.post("/api/fs/open", json={"path": str(tmp_path)})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_open_rejects_wrong_token(client: httpx.AsyncClient, tmp_path: Path) -> None:
    resp = await client.post(
        "/api/fs/open",
        json={"path": str(tmp_path)},
        headers={"X-Argos-Token": "bad-token"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/fs/open — happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_open_returns_204_on_success(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    with patch("backend.api.filesystem.open_in_explorer") as mock_open:
        resp = await client.post(
            "/api/fs/open",
            json={"path": str(tmp_path)},
            headers={"X-Argos-Token": token},
        )
    assert resp.status_code == 204
    mock_open.assert_called_once_with(tmp_path)


# ---------------------------------------------------------------------------
# POST /api/fs/open — error handling
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_open_returns_400_on_oserror(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    with patch(
        "backend.api.filesystem.open_in_explorer",
        side_effect=OSError("explorer failed"),
    ):
        resp = await client.post(
            "/api/fs/open",
            json={"path": str(tmp_path)},
            headers={"X-Argos-Token": token},
        )
    assert resp.status_code == 400
    assert "explorer failed" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# DELETE /api/fs/item — auth
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_requires_token(client: httpx.AsyncClient, tmp_path: Path) -> None:
    f = tmp_path / "f.txt"
    f.write_text("x")
    resp = await client.request(
        "DELETE", "/api/fs/item", json={"path": str(f), "permanent": False, "confirm": True}
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/fs/item — confirm gate
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_returns_422_when_confirm_false(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    f = tmp_path / "f.txt"
    f.write_text("x")
    resp = await client.request(
        "DELETE",
        "/api/fs/item",
        json={"path": str(f), "permanent": False, "confirm": False},
        headers={"X-Argos-Token": token},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_delete_returns_422_when_confirm_missing(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    f = tmp_path / "f.txt"
    f.write_text("x")
    resp = await client.request(
        "DELETE",
        "/api/fs/item",
        json={"path": str(f), "permanent": False},
        headers={"X-Argos-Token": token},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# DELETE /api/fs/item — recycle bin (default)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_recycle_bin_calls_send2trash(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    f = tmp_path / "f.txt"
    f.write_text("x")
    with patch("backend.api.filesystem.send2trash") as mock_trash:
        resp = await client.request(
            "DELETE",
            "/api/fs/item",
            json={"path": str(f), "permanent": False, "confirm": True},
            headers={"X-Argos-Token": token},
        )
    assert resp.status_code == 204
    mock_trash.assert_called_once_with(str(f))


# ---------------------------------------------------------------------------
# DELETE /api/fs/item — permanent deletion
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_permanent_file_calls_path_unlink(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    f = tmp_path / "f.txt"
    f.write_text("x")
    mock_unlink = MagicMock()
    with patch.object(Path, "is_dir", return_value=False), patch.object(Path, "unlink", mock_unlink):
        resp = await client.request(
            "DELETE",
            "/api/fs/item",
            json={"path": str(f), "permanent": True, "confirm": True},
            headers={"X-Argos-Token": token},
        )
    assert resp.status_code == 204
    mock_unlink.assert_called_once_with()


@pytest.mark.asyncio
async def test_delete_permanent_dir_calls_shutil_rmtree(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    d = tmp_path / "subdir"
    d.mkdir()
    mock_shutil = MagicMock()
    with patch.object(Path, "is_dir", return_value=True), patch("backend.api.filesystem.shutil", mock_shutil):
        resp = await client.request(
            "DELETE",
            "/api/fs/item",
            json={"path": str(d), "permanent": True, "confirm": True},
            headers={"X-Argos-Token": token},
        )
    assert resp.status_code == 204
    mock_shutil.rmtree.assert_called_once_with(Path(str(d)))


# ---------------------------------------------------------------------------
# DELETE /api/fs/item — error handling
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_returns_400_on_oserror(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    f = tmp_path / "f.txt"
    f.write_text("x")
    with patch(
        "backend.api.filesystem.send2trash",
        side_effect=OSError("permission denied"),
    ):
        resp = await client.request(
            "DELETE",
            "/api/fs/item",
            json={"path": str(f), "permanent": False, "confirm": True},
            headers={"X-Argos-Token": token},
        )
    assert resp.status_code == 400
    assert "permission denied" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Integration: DELETE actually removes a real temp file (no mocks)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_recycle_bin_integration(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    """Recycle-bin delete via a real send2trash call removes the file."""
    f = tmp_path / "disposable.txt"
    f.write_text("goodbye")
    resp = await client.request(
        "DELETE",
        "/api/fs/item",
        json={"path": str(f), "permanent": False, "confirm": True},
        headers={"X-Argos-Token": token},
    )
    assert resp.status_code == 204
    assert not f.exists()


@pytest.mark.asyncio
async def test_delete_permanent_integration(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    """Permanent delete removes the file without Recycle Bin."""
    f = tmp_path / "gone.txt"
    f.write_text("gone")
    resp = await client.request(
        "DELETE",
        "/api/fs/item",
        json={"path": str(f), "permanent": True, "confirm": True},
        headers={"X-Argos-Token": token},
    )
    assert resp.status_code == 204
    assert not f.exists()


@pytest.mark.asyncio
async def test_delete_permanent_dir_integration(
    client: httpx.AsyncClient, token: str, tmp_path: Path
) -> None:
    """Permanent delete removes a directory tree."""
    d = tmp_path / "doomed"
    d.mkdir()
    (d / "child.txt").write_text("x")
    resp = await client.request(
        "DELETE",
        "/api/fs/item",
        json={"path": str(d), "permanent": True, "confirm": True},
        headers={"X-Argos-Token": token},
    )
    assert resp.status_code == 204
    assert not d.exists()
