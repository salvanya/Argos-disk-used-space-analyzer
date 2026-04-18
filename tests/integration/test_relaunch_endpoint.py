"""Integration tests for POST /api/system/relaunch-admin."""

from __future__ import annotations

from collections.abc import AsyncIterator
from unittest.mock import patch

import httpx
import pytest
from backend.app import create_app
from fastapi import FastAPI
from httpx import ASGITransport


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
# Auth
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_relaunch_requires_token(client: httpx.AsyncClient) -> None:
    resp = await client.post("/api/system/relaunch-admin")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Platform guard
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_relaunch_rejects_non_windows(client: httpx.AsyncClient, token: str) -> None:
    with patch("backend.api.system.sys.platform", "linux"):
        resp = await client.post(
            "/api/system/relaunch-admin", headers={"X-Argos-Token": token}
        )
    assert resp.status_code == 501
    assert "platformUnsupported" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Already elevated guard
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_relaunch_rejects_when_already_admin(
    client: httpx.AsyncClient, token: str
) -> None:
    with (
        patch("backend.api.system.sys.platform", "win32"),
        patch("backend.api.system.is_admin", return_value=True),
    ):
        resp = await client.post(
            "/api/system/relaunch-admin", headers={"X-Argos-Token": token}
        )
    assert resp.status_code == 409
    assert "alreadyElevated" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Success path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_relaunch_success_calls_shell_execute(
    client: httpx.AsyncClient, token: str
) -> None:
    with (
        patch("backend.api.system.sys.platform", "win32"),
        patch("backend.api.system.is_admin", return_value=False),
        patch("backend.api.system._relaunch_as_admin", return_value=42) as stub,
    ):
        resp = await client.post(
            "/api/system/relaunch-admin", headers={"X-Argos-Token": token}
        )
    assert resp.status_code == 202
    stub.assert_called_once()


# ---------------------------------------------------------------------------
# UAC declined
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_relaunch_surfaces_uac_declined(
    client: httpx.AsyncClient, token: str
) -> None:
    # ShellExecuteW returns <= 32 on failure. 5 = SE_ERR_ACCESSDENIED (UAC declined).
    with (
        patch("backend.api.system.sys.platform", "win32"),
        patch("backend.api.system.is_admin", return_value=False),
        patch("backend.api.system._relaunch_as_admin", return_value=5),
    ):
        resp = await client.post(
            "/api/system/relaunch-admin", headers={"X-Argos-Token": token}
        )
    assert resp.status_code == 403
    assert "uacDeclined" in resp.json()["detail"]
