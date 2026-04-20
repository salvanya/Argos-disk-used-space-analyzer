"""Tests for ScanCache.clear() — bulk wipe of all cached scans."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pytest
from backend.core.cache import ScanCache
from backend.core.models import NodeType, ScanNode, ScanResult


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
def cache(tmp_path: Path) -> ScanCache:
    return ScanCache(tmp_path / "test.db")


def test_clear_removes_all_rows(cache: ScanCache) -> None:
    cache.put(_make_result("C:/one"))
    cache.put(_make_result("C:/two"))
    cache.put(_make_result("C:/three"))
    assert len(cache.list_roots()) == 3

    cache.clear()

    assert cache.list_roots() == []


def test_clear_on_empty_cache_is_noop(cache: ScanCache) -> None:
    cache.clear()  # must not raise
    assert cache.list_roots() == []


def test_clear_is_idempotent(cache: ScanCache) -> None:
    cache.put(_make_result("C:/one"))
    cache.clear()
    cache.clear()
    assert cache.list_roots() == []
