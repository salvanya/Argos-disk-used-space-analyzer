"""Shared pytest fixtures for Argos tests."""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

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


@pytest.fixture()
def make_tree(tmp_path: Path) -> Callable[..., Path]:
    """
    Build a real directory tree under tmp_path from a nested dict spec.

    Keys are file/directory names.
    - int value  → create a file of that many bytes
    - dict value → create a subdirectory and recurse

    Returns the root Path of the created tree.

    Example::

        root = make_tree({
            "file_a.txt": 100,
            "subdir": {
                "file_b.txt": 50,
            },
        })
    """

    def _build(spec: dict[str, Any], parent: Path) -> None:
        for name, value in spec.items():
            path = parent / name
            if isinstance(value, dict):
                path.mkdir()
                _build(value, path)
            else:
                path.write_bytes(b"x" * int(value))

    def factory(spec: dict[str, Any]) -> Path:
        root = tmp_path / "tree"
        root.mkdir()
        _build(spec, root)
        return root

    return factory
