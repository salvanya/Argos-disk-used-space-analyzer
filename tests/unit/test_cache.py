"""Unit tests for backend.core.cache (M14 per-folder lazy cache)."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

import pytest
from backend.core.cache import ScanCache
from backend.core.errors import CacheError
from backend.core.models import LevelScanNode, LevelScanResult, NodeType

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_level(
    root_path: str,
    folder_path: str | None = None,
    *,
    file_count: int = 1,
    file_size: int = 42,
    options_hash: str = "deadbeefcafebabe",
) -> LevelScanResult:
    folder = folder_path or root_path
    children = [
        LevelScanNode(
            name=f"file_{i}.txt",
            path=f"{folder}/file_{i}.txt",
            node_type=NodeType.file,
            size=file_size,
            accessible=True,
            is_link=False,
        )
        for i in range(file_count)
    ]
    return LevelScanResult(
        root_path=root_path,
        folder_path=folder,
        scanned_at=datetime.now(tz=UTC),
        duration_seconds=0.01,
        accessible=True,
        is_link=False,
        direct_files=file_count,
        direct_folders=0,
        direct_bytes_known=file_count * file_size,
        error_count=0,
        children=children,
        options_hash=options_hash,
    )


@pytest.fixture()
def cache(tmp_path: Path) -> ScanCache:
    return ScanCache(db_path=tmp_path / "test_cache.db")


# ---------------------------------------------------------------------------
# get_level / put_level
# ---------------------------------------------------------------------------


def test_get_level_returns_none_when_empty(cache: ScanCache) -> None:
    assert cache.get_level("C:/nope", "C:/nope", "deadbeefcafebabe") is None


def test_put_level_then_get_level_roundtrip(cache: ScanCache) -> None:
    level = _make_level("C:/root", file_count=2, file_size=100)
    cache.put_level(level)
    retrieved = cache.get_level("C:/root", "C:/root", level.options_hash)
    assert retrieved is not None
    assert retrieved.direct_files == 2
    assert retrieved.direct_bytes_known == 200
    assert [c.name for c in retrieved.children] == ["file_0.txt", "file_1.txt"]


def test_put_level_upsert_same_triple_overwrites(cache: ScanCache) -> None:
    old = _make_level("C:/root", file_count=1, file_size=10)
    cache.put_level(old)
    new = _make_level("C:/root", file_count=3, file_size=50)  # same hash by default
    cache.put_level(new)
    retrieved = cache.get_level("C:/root", "C:/root", new.options_hash)
    assert retrieved is not None
    assert retrieved.direct_files == 3
    assert retrieved.direct_bytes_known == 150


def test_put_level_different_options_hash_is_separate_row(cache: ScanCache) -> None:
    level_a = _make_level("C:/root", options_hash="aaaaaaaaaaaaaaaa")
    level_b = _make_level("C:/root", options_hash="bbbbbbbbbbbbbbbb")
    cache.put_level(level_a)
    cache.put_level(level_b)
    got_a = cache.get_level("C:/root", "C:/root", "aaaaaaaaaaaaaaaa")
    got_b = cache.get_level("C:/root", "C:/root", "bbbbbbbbbbbbbbbb")
    assert got_a is not None and got_a.options_hash == "aaaaaaaaaaaaaaaa"
    assert got_b is not None and got_b.options_hash == "bbbbbbbbbbbbbbbb"


def test_get_level_options_hash_is_part_of_key(cache: ScanCache) -> None:
    level = _make_level("C:/root", options_hash="aaaaaaaaaaaaaaaa")
    cache.put_level(level)
    assert cache.get_level("C:/root", "C:/root", "bbbbbbbbbbbbbbbb") is None


def test_put_level_descendant_separate_from_root(cache: ScanCache) -> None:
    root_level = _make_level("C:/root")
    sub_level = _make_level("C:/root", folder_path="C:/root/sub")
    cache.put_level(root_level)
    cache.put_level(sub_level)
    assert cache.get_level("C:/root", "C:/root", root_level.options_hash) is not None
    assert cache.get_level("C:/root", "C:/root/sub", sub_level.options_hash) is not None


# ---------------------------------------------------------------------------
# invalidate_level
# ---------------------------------------------------------------------------


def _seed_tree(cache: ScanCache, h: str = "deadbeefcafebabe") -> None:
    cache.put_level(_make_level("C:/root", options_hash=h))
    cache.put_level(_make_level("C:/root", folder_path="C:/root/sub", options_hash=h))
    cache.put_level(_make_level("C:/root", folder_path="C:/root/sub/deep", options_hash=h))
    cache.put_level(_make_level("C:/root", folder_path="C:/root/other", options_hash=h))


def test_invalidate_level_non_recursive_removes_only_exact(cache: ScanCache) -> None:
    _seed_tree(cache)
    h = "deadbeefcafebabe"
    cache.invalidate_level("C:/root", "C:/root/sub", recursive=False)
    assert cache.get_level("C:/root", "C:/root/sub", h) is None
    # Descendants survive
    assert cache.get_level("C:/root", "C:/root/sub/deep", h) is not None
    # Siblings survive
    assert cache.get_level("C:/root", "C:/root/other", h) is not None
    # Root survives
    assert cache.get_level("C:/root", "C:/root", h) is not None


def test_invalidate_level_recursive_removes_descendants(cache: ScanCache) -> None:
    _seed_tree(cache)
    h = "deadbeefcafebabe"
    cache.invalidate_level("C:/root", "C:/root/sub", recursive=True)
    assert cache.get_level("C:/root", "C:/root/sub", h) is None
    assert cache.get_level("C:/root", "C:/root/sub/deep", h) is None
    # Siblings and root untouched
    assert cache.get_level("C:/root", "C:/root/other", h) is not None
    assert cache.get_level("C:/root", "C:/root", h) is not None


def test_invalidate_level_recursive_at_root_wipes_root_and_all(cache: ScanCache) -> None:
    _seed_tree(cache)
    h = "deadbeefcafebabe"
    cache.invalidate_level("C:/root", "C:/root", recursive=True)
    assert cache.get_level("C:/root", "C:/root", h) is None
    assert cache.get_level("C:/root", "C:/root/sub", h) is None
    assert cache.get_level("C:/root", "C:/root/other", h) is None


def test_invalidate_level_prefix_does_not_match_siblings(cache: ScanCache) -> None:
    """`LIKE path || '/%'` must not match a sibling whose name starts with the target."""
    h = "deadbeefcafebabe"
    cache.put_level(_make_level("C:/root", folder_path="C:/root/foo", options_hash=h))
    cache.put_level(_make_level("C:/root", folder_path="C:/root/foobar", options_hash=h))
    cache.invalidate_level("C:/root", "C:/root/foo", recursive=True)
    assert cache.get_level("C:/root", "C:/root/foo", h) is None
    assert cache.get_level("C:/root", "C:/root/foobar", h) is not None


def test_invalidate_level_nonexistent_is_noop(cache: ScanCache) -> None:
    cache.invalidate_level("C:/gone", "C:/gone", recursive=True)  # must not raise


# ---------------------------------------------------------------------------
# list_roots
# ---------------------------------------------------------------------------


def test_list_roots_empty_when_no_scans(cache: ScanCache) -> None:
    assert cache.list_roots() == []


def test_list_roots_only_returns_root_level_rows(cache: ScanCache) -> None:
    _seed_tree(cache)
    roots = cache.list_roots()
    # Only the row where folder_path == root_path counts as a "root".
    assert len(roots) == 1
    assert roots[0][0] == "C:/root"


def test_list_roots_returns_root_path_datetime_options_hash(cache: ScanCache) -> None:
    cache.put_level(_make_level("C:/one", options_hash="1111111111111111"))
    cache.put_level(_make_level("C:/two", options_hash="2222222222222222"))
    roots = cache.list_roots()
    assert len(roots) == 2
    triples = {(r[0], r[2]) for r in roots}
    assert ("C:/one", "1111111111111111") in triples
    assert ("C:/two", "2222222222222222") in triples
    # Timestamp element is a tz-aware datetime
    assert all(isinstance(r[1], datetime) and r[1].tzinfo is not None for r in roots)


def test_list_roots_deduplicates_by_root_keeping_most_recent(cache: ScanCache) -> None:
    """When a root has multiple option variants, list_roots returns the newest only."""
    older = _make_level("C:/root", options_hash="aaaaaaaaaaaaaaaa")
    # Force a newer scanned_at on the second row
    newer = _make_level("C:/root", options_hash="bbbbbbbbbbbbbbbb")
    newer = newer.model_copy(
        update={"scanned_at": datetime(2030, 1, 1, tzinfo=UTC)}
    )
    cache.put_level(older)
    cache.put_level(newer)
    roots = cache.list_roots()
    assert len(roots) == 1
    assert roots[0][0] == "C:/root"
    assert roots[0][2] == "bbbbbbbbbbbbbbbb"


# ---------------------------------------------------------------------------
# clear
# ---------------------------------------------------------------------------


def test_clear_removes_all_rows(cache: ScanCache) -> None:
    _seed_tree(cache)
    assert len(cache.list_roots()) == 1
    cache.clear()
    assert cache.list_roots() == []
    assert cache.get_level("C:/root", "C:/root/sub", "deadbeefcafebabe") is None


def test_clear_on_empty_cache_is_noop(cache: ScanCache) -> None:
    cache.clear()
    assert cache.list_roots() == []


# ---------------------------------------------------------------------------
# Migration from the M2 eager-scan schema
# ---------------------------------------------------------------------------


def test_init_drops_legacy_scans_table(tmp_path: Path) -> None:
    db_path = tmp_path / "legacy.db"
    # Seed with the old M2 schema + one row
    with sqlite3.connect(db_path) as conn:
        conn.executescript(
            """
            CREATE TABLE scans (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                root_path      TEXT    NOT NULL,
                scanned_at     TEXT    NOT NULL,
                duration_secs  REAL    NOT NULL,
                total_files    INTEGER NOT NULL,
                total_folders  INTEGER NOT NULL,
                total_size     INTEGER NOT NULL,
                error_count    INTEGER NOT NULL,
                tree_json      TEXT    NOT NULL
            );
            """
        )
        conn.execute(
            "INSERT INTO scans (root_path, scanned_at, duration_secs, total_files, "
            "total_folders, total_size, error_count, tree_json) VALUES "
            "('C:/legacy', '2026-01-01T00:00:00+00:00', 1.0, 0, 0, 0, 0, '{}')"
        )
        conn.commit()

    ScanCache(db_path=db_path)

    with sqlite3.connect(db_path) as conn:
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert "scans" not in tables
    assert "scan_levels" in tables


def test_init_on_fresh_db_is_fine(tmp_path: Path) -> None:
    cache = ScanCache(db_path=tmp_path / "fresh.db")
    assert cache.list_roots() == []


# ---------------------------------------------------------------------------
# Error handling — CacheError raised on DB failure
# ---------------------------------------------------------------------------


def test_get_level_raises_cache_error_on_db_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache = ScanCache(db_path=tmp_path / "err.db")

    def _bad_connect(*_: object, **__: object) -> None:
        raise sqlite3.OperationalError("disk I/O error")

    monkeypatch.setattr("backend.core.cache.sqlite3.connect", _bad_connect)
    with pytest.raises(CacheError):
        cache.get_level("C:/x", "C:/x", "deadbeefcafebabe")


def test_put_level_raises_cache_error_on_db_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache = ScanCache(db_path=tmp_path / "err.db")
    level = _make_level("C:/x")

    def _bad_connect(*_: object, **__: object) -> None:
        raise sqlite3.OperationalError("disk I/O error")

    monkeypatch.setattr("backend.core.cache.sqlite3.connect", _bad_connect)
    with pytest.raises(CacheError):
        cache.put_level(level)


def test_invalidate_level_raises_cache_error_on_db_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache = ScanCache(db_path=tmp_path / "err.db")

    def _bad_connect(*_: object, **__: object) -> None:
        raise sqlite3.OperationalError("disk I/O error")

    monkeypatch.setattr("backend.core.cache.sqlite3.connect", _bad_connect)
    with pytest.raises(CacheError):
        cache.invalidate_level("C:/x", "C:/x", recursive=True)


def test_list_roots_raises_cache_error_on_db_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache = ScanCache(db_path=tmp_path / "err.db")

    def _bad_connect(*_: object, **__: object) -> None:
        raise sqlite3.OperationalError("disk I/O error")

    monkeypatch.setattr("backend.core.cache.sqlite3.connect", _bad_connect)
    with pytest.raises(CacheError):
        cache.list_roots()


def test_clear_raises_cache_error_on_db_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cache = ScanCache(db_path=tmp_path / "err.db")

    def _bad_connect(*_: object, **__: object) -> None:
        raise sqlite3.OperationalError("disk I/O error")

    monkeypatch.setattr("backend.core.cache.sqlite3.connect", _bad_connect)
    with pytest.raises(CacheError):
        cache.clear()
