"""Unit tests for DiskScanner.scan_level (M14 — lazy per-level scans)."""

from __future__ import annotations

import ctypes
import os
import sys
from collections.abc import Callable
from pathlib import Path

import pytest
from backend.core.models import NodeType, ScanOptions
from backend.core.scanner import DiskScanner, compute_options_hash

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def scanner() -> DiskScanner:
    return DiskScanner()


@pytest.fixture()
def block_scandir(monkeypatch: pytest.MonkeyPatch) -> Callable[[Path], None]:
    """Mark a path so that os.scandir on it raises PermissionError."""
    _real_scandir = os.scandir
    blocked: set[str] = set()

    def _patched(path: str | Path | os.PathLike[str]) -> os.ScandirIterator:  # type: ignore[type-arg]
        norm = str(Path(path))
        if norm in blocked:
            raise PermissionError(f"[Errno 13] Permission denied: '{path}'")
        return _real_scandir(path)

    monkeypatch.setattr(os, "scandir", _patched)

    def block(path: Path) -> None:
        blocked.add(str(path))

    return block


# ---------------------------------------------------------------------------
# Structure — only direct children
# ---------------------------------------------------------------------------


def test_scan_level_returns_only_direct_children(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree(
        {
            "file_a.txt": 100,
            "subdir": {
                "file_b.txt": 50,
                "nested": {"deep.txt": 25},
            },
        }
    )
    result = scanner.scan_level(root)
    names = {c.name for c in result.children}
    assert names == {"file_a.txt", "subdir"}
    # "subdir" appears as a stub — its own children are NOT present at this level.
    subdir = next(c for c in result.children if c.name == "subdir")
    assert subdir.node_type is NodeType.folder
    # No nested attribute at all — LevelScanNode doesn't carry children.
    assert not hasattr(subdir, "children")


def test_scan_level_folder_children_have_null_size(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"subdir": {"file.txt": 100}})
    result = scanner.scan_level(root)
    subdir = next(c for c in result.children if c.name == "subdir")
    assert subdir.node_type is NodeType.folder
    assert subdir.size is None


def test_scan_level_file_children_have_real_size(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"a.txt": 42, "b.bin": 1337})
    result = scanner.scan_level(root)
    a = next(c for c in result.children if c.name == "a.txt")
    b = next(c for c in result.children if c.name == "b.bin")
    assert a.size == 42
    assert b.size == 1337


def test_scan_level_root_and_folder_paths_default_to_same(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"a.txt": 1})
    result = scanner.scan_level(root)
    assert result.root_path == root.as_posix()
    assert result.folder_path == root.as_posix()


def test_scan_level_explicit_root_path_preserved(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"sub": {"a.txt": 1}})
    sub = root / "sub"
    result = scanner.scan_level(sub, root_path=root)
    assert result.root_path == root.as_posix()
    assert result.folder_path == sub.as_posix()


# ---------------------------------------------------------------------------
# Symlinks
# ---------------------------------------------------------------------------


def test_scan_level_symlink_child_is_stub_not_followed(
    tmp_path: Path, scanner: DiskScanner
) -> None:
    target = tmp_path / "real.bin"
    target.write_bytes(b"x" * 500)
    link = tmp_path / "link.bin"
    try:
        link.symlink_to(target)
    except (OSError, NotImplementedError):
        pytest.skip("Cannot create symlinks without elevated privileges or Developer Mode")

    result = scanner.scan_level(tmp_path)
    link_node = next(c for c in result.children if c.name == "link.bin")
    assert link_node.is_link is True
    assert link_node.node_type is NodeType.symlink
    # Symlinks contribute 0 to direct_bytes_known (the real.bin size alone survives).
    assert result.direct_bytes_known == 500


# ---------------------------------------------------------------------------
# Accessibility
# ---------------------------------------------------------------------------


def test_scan_level_permission_denied_on_target_returns_accessible_false(
    tmp_path: Path, scanner: DiskScanner, block_scandir: Callable[[Path], None]
) -> None:
    secret = tmp_path / "secret"
    secret.mkdir()
    (secret / "inside.txt").write_bytes(b"x" * 99)
    block_scandir(secret)

    result = scanner.scan_level(secret)
    assert result.accessible is False
    assert result.children == []
    assert result.folder_path == secret.as_posix()


def test_scan_level_permission_denied_on_child_file_marks_child_inaccessible(
    tmp_path: Path, scanner: DiskScanner, monkeypatch: pytest.MonkeyPatch
) -> None:
    bad = tmp_path / "bad.bin"
    bad.write_bytes(b"x" * 100)
    good = tmp_path / "good.txt"
    good.write_bytes(b"x" * 50)

    _real_stat = Path.stat

    def _patched_stat(self: Path, *, follow_symlinks: bool = True) -> os.stat_result:
        if self == bad and follow_symlinks:
            raise PermissionError("Access denied")
        return _real_stat(self, follow_symlinks=follow_symlinks)

    monkeypatch.setattr(Path, "stat", _patched_stat)

    result = scanner.scan_level(tmp_path)
    assert result.accessible is True
    bad_node = next(c for c in result.children if c.name == "bad.bin")
    good_node = next(c for c in result.children if c.name == "good.txt")
    assert bad_node.accessible is False
    assert bad_node.size == 0
    assert good_node.accessible is True
    assert good_node.size == 50
    assert result.error_count == 1


# ---------------------------------------------------------------------------
# Filtering
# ---------------------------------------------------------------------------


def test_scan_level_applies_exclude_globs(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"a.txt": 10, "node_modules": {"keep.txt": 20}, "keeper": {}})
    result = scanner.scan_level(
        root, options=ScanOptions(exclude=["**/node_modules", "**/node_modules/**"])
    )
    names = {c.name for c in result.children}
    assert names == {"a.txt", "keeper"}


@pytest.mark.skipif(sys.platform != "win32", reason="Windows FILE_ATTRIBUTE_HIDDEN only")
def test_scan_level_excludes_hidden_by_default(
    tmp_path: Path, scanner: DiskScanner
) -> None:
    visible = tmp_path / "visible.txt"
    visible.write_bytes(b"x" * 10)
    hidden = tmp_path / "hidden.txt"
    hidden.write_bytes(b"x" * 20)
    file_attribute_hidden = 0x2
    ctypes.windll.kernel32.SetFileAttributesW(str(hidden), file_attribute_hidden)  # type: ignore[attr-defined]

    result = scanner.scan_level(tmp_path)
    names = {c.name for c in result.children}
    assert "visible.txt" in names
    assert "hidden.txt" not in names


@pytest.mark.skipif(sys.platform != "win32", reason="Windows FILE_ATTRIBUTE_HIDDEN only")
def test_scan_level_includes_hidden_when_option_set(
    tmp_path: Path, scanner: DiskScanner
) -> None:
    visible = tmp_path / "visible.txt"
    visible.write_bytes(b"x" * 10)
    hidden = tmp_path / "hidden.txt"
    hidden.write_bytes(b"x" * 20)
    file_attribute_hidden = 0x2
    ctypes.windll.kernel32.SetFileAttributesW(str(hidden), file_attribute_hidden)  # type: ignore[attr-defined]

    result = scanner.scan_level(tmp_path, options=ScanOptions(include_hidden=True))
    names = {c.name for c in result.children}
    assert {"visible.txt", "hidden.txt"}.issubset(names)


@pytest.mark.skipif(sys.platform != "win32", reason="Windows FILE_ATTRIBUTE_SYSTEM only")
def test_scan_level_excludes_system_files_by_default(
    tmp_path: Path, scanner: DiskScanner
) -> None:
    visible = tmp_path / "visible.txt"
    visible.write_bytes(b"x" * 10)
    sys_file = tmp_path / "sys_file.txt"
    sys_file.write_bytes(b"x" * 30)
    file_attribute_system = 0x4
    ctypes.windll.kernel32.SetFileAttributesW(str(sys_file), file_attribute_system)  # type: ignore[attr-defined]

    result = scanner.scan_level(tmp_path)
    names = {c.name for c in result.children}
    assert "visible.txt" in names
    assert "sys_file.txt" not in names


# ---------------------------------------------------------------------------
# Degenerate inputs
# ---------------------------------------------------------------------------


def test_scan_level_on_file_path_raises(tmp_path: Path, scanner: DiskScanner) -> None:
    f = tmp_path / "not_a_dir.txt"
    f.write_bytes(b"x" * 10)
    with pytest.raises(NotADirectoryError):
        scanner.scan_level(f)


def test_scan_level_empty_folder(tmp_path: Path, scanner: DiskScanner) -> None:
    result = scanner.scan_level(tmp_path)
    assert result.children == []
    assert result.direct_files == 0
    assert result.direct_folders == 0
    assert result.direct_bytes_known == 0
    assert result.error_count == 0


# ---------------------------------------------------------------------------
# Aggregates
# ---------------------------------------------------------------------------


def test_scan_level_direct_bytes_known_excludes_folders(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree(
        {
            "a.txt": 100,
            "b.txt": 200,
            "subdir": {"hidden_inside.txt": 999},  # folder's hidden_inside is NOT in direct_bytes
        }
    )
    result = scanner.scan_level(root)
    assert result.direct_bytes_known == 300


def test_scan_level_direct_files_and_folders_counts(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree(
        {
            "a.txt": 1,
            "b.txt": 2,
            "c.txt": 3,
            "sub1": {"x.txt": 10},
            "sub2": {},
        }
    )
    result = scanner.scan_level(root)
    assert result.direct_files == 3
    assert result.direct_folders == 2


def test_scan_level_duration_is_non_negative(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"a.txt": 1})
    result = scanner.scan_level(root)
    assert result.duration_seconds >= 0.0


# ---------------------------------------------------------------------------
# Options hash
# ---------------------------------------------------------------------------


def test_compute_options_hash_deterministic() -> None:
    h1 = compute_options_hash(ScanOptions())
    h2 = compute_options_hash(ScanOptions())
    assert h1 == h2


def test_compute_options_hash_differs_by_option() -> None:
    base = compute_options_hash(ScanOptions())
    hidden = compute_options_hash(ScanOptions(include_hidden=True))
    system = compute_options_hash(ScanOptions(include_system=True))
    excluded = compute_options_hash(ScanOptions(exclude=["**/node_modules/**"]))
    assert len({base, hidden, system, excluded}) == 4


def test_compute_options_hash_is_short_hex() -> None:
    h = compute_options_hash(ScanOptions())
    assert len(h) == 16
    assert all(c in "0123456789abcdef" for c in h)


def test_compute_options_hash_order_independent_for_exclude() -> None:
    """Exclude list order is a client concern; same semantic value == same hash."""
    h1 = compute_options_hash(ScanOptions(exclude=["a", "b", "c"]))
    h2 = compute_options_hash(ScanOptions(exclude=["c", "b", "a"]))
    assert h1 == h2


def test_scan_level_options_hash_propagated_to_result(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"a.txt": 1})
    opts = ScanOptions(include_hidden=True)
    result = scanner.scan_level(root, options=opts)
    assert result.options_hash == compute_options_hash(opts)
