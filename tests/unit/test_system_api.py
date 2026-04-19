"""Unit tests for system endpoints: GET /api/config, GET /api/system/info, GET /api/folder-picker.

Tests run against an in-process ASGI app via httpx.ASGITransport — no network.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from unittest.mock import patch

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
# GET /api/config
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_config_returns_token(client: httpx.AsyncClient, token: str) -> None:
    resp = await client.get("/api/config")
    assert resp.status_code == 200
    body = resp.json()
    assert "token" in body
    assert isinstance(body["token"], str)
    assert len(body["token"]) > 0
    assert body["token"] == token


@pytest.mark.asyncio
async def test_config_requires_no_auth(client: httpx.AsyncClient) -> None:
    """Bootstrap endpoint must work without an auth header."""
    resp = await client.get("/api/config")
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# GET /api/system/info
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_system_info_requires_token(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/system/info")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_system_info_rejects_wrong_token(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/system/info", headers={"X-Argos-Token": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_system_info_returns_is_admin_and_platform(
    client: httpx.AsyncClient, token: str
) -> None:
    resp = await client.get("/api/system/info", headers={"X-Argos-Token": token})
    assert resp.status_code == 200
    body = resp.json()
    assert "is_admin" in body
    assert isinstance(body["is_admin"], bool)
    assert "platform" in body
    assert isinstance(body["platform"], str)
    assert len(body["platform"]) > 0


# ---------------------------------------------------------------------------
# GET /api/folder-picker
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_folder_picker_requires_token(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/folder-picker")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_folder_picker_returns_selected_path(
    client: httpx.AsyncClient, token: str
) -> None:
    with patch(
        "backend.api.system._open_folder_dialog", return_value="C:/Users/test"
    ):
        resp = await client.get("/api/folder-picker", headers={"X-Argos-Token": token})
    assert resp.status_code == 200
    body = resp.json()
    assert body["path"] == "C:/Users/test"


@pytest.mark.asyncio
async def test_folder_picker_returns_null_on_cancel(
    client: httpx.AsyncClient, token: str
) -> None:
    with patch("backend.api.system._open_folder_dialog", return_value=None):
        resp = await client.get("/api/folder-picker", headers={"X-Argos-Token": token})
    assert resp.status_code == 200
    body = resp.json()
    assert body["path"] is None


@pytest.mark.asyncio
async def test_folder_picker_returns_null_when_tkinter_unavailable(
    client: httpx.AsyncClient, token: str
) -> None:
    with patch(
        "backend.api.system._open_folder_dialog",
        side_effect=ImportError("No module named 'tkinter'"),
    ):
        resp = await client.get("/api/folder-picker", headers={"X-Argos-Token": token})
    assert resp.status_code == 200
    body = resp.json()
    assert body["path"] is None
