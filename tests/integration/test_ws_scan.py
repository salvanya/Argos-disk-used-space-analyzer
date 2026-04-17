"""Integration tests for the WebSocket scan endpoint (WS /ws/scan).

Uses starlette.testclient.TestClient for WebSocket support — already a transitive
dependency of FastAPI, no extra packages required.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from backend.app import create_app
from backend.core.cache import ScanCache
from fastapi import FastAPI
from starlette.testclient import TestClient

from tests.integration.test_api_scan import _make_scan_result

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def app(tmp_path: Path) -> FastAPI:
    os.environ["ARGOS_CACHE_DB"] = str(tmp_path / "ws_test_cache.sqlite")
    return create_app()


@pytest.fixture()
def auth_token(app: FastAPI) -> str:
    return app.state.auth_token


@pytest.fixture()
def cache(app: FastAPI) -> ScanCache:
    return app.state.cache


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ws_collect(app: FastAPI, payload: dict) -> list[dict]:
    """Connect to WS /ws/scan, send one payload, collect all messages until close."""
    messages: list[dict] = []
    with TestClient(app) as client, client.websocket_connect("/ws/scan") as ws:
        ws.send_json(payload)
        while True:
            try:
                data = ws.receive_json()
                messages.append(data)
                if data["type"] in ("complete", "error"):
                    break
            except Exception:
                break
    return messages


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------


def test_ws_scan_missing_token(app: FastAPI) -> None:
    messages = _ws_collect(app, {"root": "C:/whatever"})
    assert messages and messages[-1]["type"] == "error"
    text = messages[-1]["message"].lower()
    assert "token" in text or "auth" in text


def test_ws_scan_invalid_token(app: FastAPI) -> None:
    messages = _ws_collect(app, {"token": "wrong-token", "root": "C:/whatever"})
    assert messages and messages[-1]["type"] == "error"
    text = messages[-1]["message"].lower()
    assert "token" in text or "auth" in text


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


def test_ws_scan_bad_root(app: FastAPI, auth_token: str) -> None:
    messages = _ws_collect(
        app,
        {"token": auth_token, "root": "C:/this/path/does/not/exist/argos_test_xyz"},
    )
    assert messages[-1]["type"] == "error"


# ---------------------------------------------------------------------------
# Happy-path scan
# ---------------------------------------------------------------------------


def test_ws_scan_fresh(app: FastAPI, auth_token: str, tmp_path: Path) -> None:
    root = tmp_path / "scan_root"
    root.mkdir()
    (root / "a.txt").write_bytes(b"x" * 100)
    (root / "b.txt").write_bytes(b"x" * 200)
    sub = root / "sub"
    sub.mkdir()
    (sub / "c.txt").write_bytes(b"x" * 50)

    messages = _ws_collect(app, {"token": auth_token, "root": str(root), "force_rescan": True})

    types = [m["type"] for m in messages]
    assert "complete" in types

    complete = next(m for m in messages if m["type"] == "complete")
    assert complete["result"]["total_files"] == 3
    assert complete["result"]["total_size"] == 350


def test_ws_scan_result_is_cached(
    app: FastAPI, auth_token: str, cache: ScanCache, tmp_path: Path
) -> None:
    root = tmp_path / "scan_root2"
    root.mkdir()
    (root / "a.txt").write_bytes(b"x" * 100)

    _ws_collect(app, {"token": auth_token, "root": str(root), "force_rescan": True})

    cached = cache.get(root)
    assert cached is not None
    assert cached.total_files == 1


def test_ws_scan_cached_no_rescan(
    app: FastAPI, auth_token: str, cache: ScanCache, tmp_path: Path
) -> None:
    root = tmp_path / "cached_root"
    root.mkdir()
    result = _make_scan_result(root.as_posix())
    cache.put(result)

    messages = _ws_collect(app, {"token": auth_token, "root": str(root), "force_rescan": False})

    types = [m["type"] for m in messages]
    assert "progress" not in types
    assert types[-1] == "complete"


def test_ws_scan_force_rescan_overwrites_cache(
    app: FastAPI, auth_token: str, cache: ScanCache, tmp_path: Path
) -> None:
    root = tmp_path / "rescan_root"
    root.mkdir()
    (root / "real.txt").write_bytes(b"x" * 999)

    # Seed cache with stale data
    stale = _make_scan_result(root.as_posix())
    cache.put(stale)

    messages = _ws_collect(app, {"token": auth_token, "root": str(root), "force_rescan": True})

    types = [m["type"] for m in messages]
    assert "progress" in types

    complete = next(m for m in messages if m["type"] == "complete")
    assert complete["result"]["total_files"] == 1
    assert complete["result"]["total_size"] == 999

    fresh = cache.get(root)
    assert fresh is not None
    assert fresh.total_files == 1
