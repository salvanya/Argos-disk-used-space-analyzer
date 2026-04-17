"""Unit tests for backend.core.cache (TDD — written before implementation)."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest
from backend.core.cache import ScanCache
from backend.core.errors import CacheError
from backend.core.models import NodeType, ScanNode, ScanResult

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_result(root_path: str, size: int = 42) -> ScanResult:
    """Build a minimal ScanResult for testing."""
    root_node = ScanNode(
        name="root",
        path=root_path,
        node_type=NodeType.folder,
        size=size,
        accessible=True,
        is_link=False,
        children=[
            ScanNode(
                name="file.txt",
                path=root_path + "/file.txt",
                node_type=NodeType.file,
                size=size,
                accessible=True,
                is_link=False,
            )
        ],
    )
    return ScanResult(
        root=root_node,
        scanned_at=datetime.now(tz=UTC),
        duration_seconds=0.1,
        total_files=1,
        total_folders=1,
        total_size=size,
        error_count=0,
    )


@pytest.fixture()
def cache(tmp_path: Path) -> ScanCache:
    return ScanCache(db_path=tmp_path / "test_cache.db")


# ---------------------------------------------------------------------------
# get / put
# ---------------------------------------------------------------------------


def test_get_returns_none_when_cache_empty(cache: ScanCache) -> None:
    assert cache.get(Path("/nonexistent/path")) is None


def test_put_then_get_returns_equivalent_result(cache: ScanCache, tmp_path: Path) -> None:
    root = tmp_path / "mydir"
    result = _make_result(root.as_posix(), size=100)
    cache.put(result)
    retrieved = cache.get(root)
    assert retrieved is not None
    assert retrieved.total_size == 100
    assert retrieved.total_files == 1
    assert retrieved.root.name == "root"


def test_put_twice_same_root_upserts(cache: ScanCache, tmp_path: Path) -> None:
    root = tmp_path / "mydir"
    old = _make_result(root.as_posix(), size=100)
    new = _make_result(root.as_posix(), size=999)
    cache.put(old)
    cache.put(new)
    retrieved = cache.get(root)
    assert retrieved is not None
    assert retrieved.total_size == 999


def test_put_preserves_nested_children(cache: ScanCache, tmp_path: Path) -> None:
    root_path = (tmp_path / "deep").as_posix()
    child = ScanNode(
        name="sub",
        path=root_path + "/sub",
        node_type=NodeType.folder,
        size=50,
        accessible=True,
        is_link=False,
        children=[
            ScanNode(
                name="file.txt",
                path=root_path + "/sub/file.txt",
                node_type=NodeType.file,
                size=50,
                accessible=True,
                is_link=False,
            )
        ],
    )
    root_node = ScanNode(
        name="deep",
        path=root_path,
        node_type=NodeType.folder,
        size=50,
        accessible=True,
        is_link=False,
        children=[child],
    )
    result = ScanResult(
        root=root_node,
        scanned_at=datetime.now(tz=UTC),
        duration_seconds=0.5,
        total_files=1,
        total_folders=2,
        total_size=50,
        error_count=0,
    )
    cache.put(result)
    retrieved = cache.get(tmp_path / "deep")
    assert retrieved is not None
    assert len(retrieved.root.children) == 1
    assert retrieved.root.children[0].name == "sub"
    assert len(retrieved.root.children[0].children) == 1


# ---------------------------------------------------------------------------
# delete
# ---------------------------------------------------------------------------


def test_delete_then_get_returns_none(cache: ScanCache, tmp_path: Path) -> None:
    root = tmp_path / "mydir"
    cache.put(_make_result(root.as_posix()))
    cache.delete(root)
    assert cache.get(root) is None


def test_delete_nonexistent_does_not_raise(cache: ScanCache, tmp_path: Path) -> None:
    # Should be a no-op, not an error
    cache.delete(tmp_path / "ghost")


# ---------------------------------------------------------------------------
# list_roots
# ---------------------------------------------------------------------------


def test_list_roots_empty_when_no_scans(cache: ScanCache) -> None:
    assert cache.list_roots() == []


def test_list_roots_returns_all_stored_roots(cache: ScanCache, tmp_path: Path) -> None:
    paths = [tmp_path / f"dir_{i}" for i in range(3)]
    for p in paths:
        cache.put(_make_result(p.as_posix()))
    roots = cache.list_roots()
    assert len(roots) == 3
    stored_paths = {r[0] for r in roots}
    for p in paths:
        assert p.as_posix() in stored_paths


def test_list_roots_returns_path_and_datetime(cache: ScanCache, tmp_path: Path) -> None:
    root = tmp_path / "mydir"
    cache.put(_make_result(root.as_posix()))
    roots = cache.list_roots()
    assert len(roots) == 1
    path_str, scanned_at = roots[0]
    assert path_str == root.as_posix()
    assert isinstance(scanned_at, datetime)


# ---------------------------------------------------------------------------
# Error handling — CacheError raised on DB failure
# ---------------------------------------------------------------------------


def test_get_raises_cache_error_on_db_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache = ScanCache(db_path=tmp_path / "err.db")

    def _bad_connect(*_: object, **__: object) -> None:
        raise sqlite3.OperationalError("disk I/O error")

    monkeypatch.setattr("backend.core.cache.sqlite3.connect", _bad_connect)
    with pytest.raises(CacheError):
        cache.get(tmp_path / "x")


def test_put_raises_cache_error_on_db_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache = ScanCache(db_path=tmp_path / "err.db")
    result = _make_result((tmp_path / "x").as_posix())

    def _bad_connect(*_: object, **__: object) -> None:
        raise sqlite3.OperationalError("disk I/O error")

    monkeypatch.setattr("backend.core.cache.sqlite3.connect", _bad_connect)
    with pytest.raises(CacheError):
        cache.put(result)


def test_delete_raises_cache_error_on_db_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache = ScanCache(db_path=tmp_path / "err.db")

    def _bad_connect(*_: object, **__: object) -> None:
        raise sqlite3.OperationalError("disk I/O error")

    monkeypatch.setattr("backend.core.cache.sqlite3.connect", _bad_connect)
    with pytest.raises(CacheError):
        cache.delete(tmp_path / "x")


def test_list_roots_raises_cache_error_on_db_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache = ScanCache(db_path=tmp_path / "err.db")

    def _bad_connect(*_: object, **__: object) -> None:
        raise sqlite3.OperationalError("disk I/O error")

    monkeypatch.setattr("backend.core.cache.sqlite3.connect", _bad_connect)
    with pytest.raises(CacheError):
        cache.list_roots()
