"""Unit tests for backend.core.scanner (TDD — written before implementation)."""

from __future__ import annotations

import ctypes
import os
import sys
from collections.abc import Callable
from pathlib import Path

import pytest
from backend.core.models import NodeType, ScanOptions
from backend.core.scanner import DiskScanner

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def scanner() -> DiskScanner:
    return DiskScanner()


# Fixture: block os.scandir for a specific path, simulating PermissionError.
@pytest.fixture()
def block_scandir(monkeypatch: pytest.MonkeyPatch) -> Callable[[Path], None]:
    """
    Returns a callable that marks a path as blocked.
    After calling block(path), os.scandir(path) will raise PermissionError.
    """
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
# Basic structure
# ---------------------------------------------------------------------------


def test_scan_single_file(tmp_path: Path, scanner: DiskScanner) -> None:
    f = tmp_path / "hello.txt"
    f.write_bytes(b"x" * 42)
    result = scanner.scan(tmp_path)
    assert result.total_files == 1
    assert result.total_size == 42
    file_node = next(c for c in result.root.children if c.name == "hello.txt")
    assert file_node.node_type == NodeType.file
    assert file_node.size == 42
    assert file_node.accessible is True
    assert file_node.is_link is False


def test_scan_empty_folder(tmp_path: Path, scanner: DiskScanner) -> None:
    result = scanner.scan(tmp_path)
    assert result.total_files == 0
    assert result.total_size == 0
    assert result.root.children == []
    assert result.root.size == 0


def test_scan_nested_tree(make_tree: Callable[..., Path], scanner: DiskScanner) -> None:
    root = make_tree(
        {
            "file_a.txt": 100,
            "file_b.txt": 200,
            "subdir": {
                "file_c.txt": 50,
                "nested": {
                    "file_d.txt": 25,
                },
            },
        }
    )
    result = scanner.scan(root)
    assert result.total_files == 4
    assert result.total_size == 375
    # Root size == total size
    assert result.root.size == 375
    # subdir size == 75 (file_c + file_d)
    subdir_node = next(c for c in result.root.children if c.name == "subdir")
    assert subdir_node.size == 75
    assert subdir_node.node_type == NodeType.folder


def test_scan_result_total_size_equals_root_node_size(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"a.txt": 111, "b.txt": 222, "sub": {"c.txt": 333}})
    result = scanner.scan(root)
    assert result.total_size == result.root.size


def test_scan_result_total_files_count(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"a.txt": 10, "b.txt": 20, "sub": {"c.txt": 30, "d.txt": 40}})
    result = scanner.scan(root)
    assert result.total_files == 4


def test_scan_result_total_folders_count(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    # root + sub + nested = 3 folders
    root = make_tree({"a.txt": 10, "sub": {"b.txt": 20, "nested": {"c.txt": 30}}})
    result = scanner.scan(root)
    assert result.total_folders == 3


# ---------------------------------------------------------------------------
# Symlinks
# ---------------------------------------------------------------------------


def test_scan_symlink_file_excluded_from_parent_size(tmp_path: Path, scanner: DiskScanner) -> None:
    target = tmp_path / "big_file.bin"
    target.write_bytes(b"x" * 500)
    link = tmp_path / "link_to_big.bin"
    try:
        link.symlink_to(target)
    except (OSError, NotImplementedError):
        pytest.skip("Cannot create symlinks without elevated privileges or Developer Mode")

    result = scanner.scan(tmp_path)

    link_node = next(c for c in result.root.children if c.name == "link_to_big.bin")
    assert link_node.is_link is True
    assert link_node.node_type == NodeType.symlink
    # Only the real file's size counts toward the parent
    assert result.root.size == 500


def test_scan_symlink_dir_not_traversed(tmp_path: Path, scanner: DiskScanner) -> None:
    target_dir = tmp_path / "real_dir"
    target_dir.mkdir()
    (target_dir / "inside.txt").write_bytes(b"y" * 999)

    link_dir = tmp_path / "link_dir"
    try:
        link_dir.symlink_to(target_dir, target_is_directory=True)
    except (OSError, NotImplementedError):
        pytest.skip("Cannot create symlinks without elevated privileges or Developer Mode")

    result = scanner.scan(tmp_path)

    link_node = next(c for c in result.root.children if c.name == "link_dir")
    assert link_node.is_link is True
    assert link_node.node_type == NodeType.symlink
    assert link_node.children == []
    # Only real_dir/inside.txt (999 bytes) counts — link is excluded
    assert result.root.size == 999


# ---------------------------------------------------------------------------
# Inaccessible directories
# ---------------------------------------------------------------------------


def test_scan_inaccessible_dir_does_not_raise(
    tmp_path: Path, scanner: DiskScanner, block_scandir: Callable[[Path], None]
) -> None:
    secret = tmp_path / "secret"
    secret.mkdir()
    (secret / "file.txt").write_bytes(b"x" * 100)
    block_scandir(secret)
    # Must complete without raising
    result = scanner.scan(tmp_path)
    assert result is not None


def test_scan_inaccessible_dir_marked_accessible_false(
    tmp_path: Path, scanner: DiskScanner, block_scandir: Callable[[Path], None]
) -> None:
    secret = tmp_path / "secret"
    secret.mkdir()
    block_scandir(secret)
    result = scanner.scan(tmp_path)
    secret_node = next(c for c in result.root.children if c.name == "secret")
    assert secret_node.accessible is False
    assert secret_node.size == 0


def test_scan_error_count_incremented_for_inaccessible(
    tmp_path: Path, scanner: DiskScanner, block_scandir: Callable[[Path], None]
) -> None:
    (tmp_path / "a").mkdir()
    (tmp_path / "b").mkdir()
    block_scandir(tmp_path / "a")
    result = scanner.scan(tmp_path)
    assert result.error_count >= 1


# ---------------------------------------------------------------------------
# Progress callback
# ---------------------------------------------------------------------------


def test_scan_progress_callback_called(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"a.txt": 1, "b.txt": 2, "sub": {"c.txt": 3}})
    calls: list[int] = []
    scanner.scan(root, progress_callback=calls.append)
    assert len(calls) > 0


def test_scan_progress_callback_monotonically_increasing(
    make_tree: Callable[..., Path], scanner: DiskScanner
) -> None:
    root = make_tree({"a.txt": 1, "b.txt": 2, "sub": {"c.txt": 3}})
    calls: list[int] = []
    scanner.scan(root, progress_callback=calls.append)
    assert calls == sorted(calls)
    assert calls[-1] >= len(calls)


# ---------------------------------------------------------------------------
# Hidden / system file filtering  (Windows-specific attribute check)
# ---------------------------------------------------------------------------


@pytest.mark.skipif(sys.platform != "win32", reason="Windows FILE_ATTRIBUTE_HIDDEN only")
def test_scan_exclude_hidden_by_default(tmp_path: Path, scanner: DiskScanner) -> None:
    visible = tmp_path / "visible.txt"
    visible.write_bytes(b"x" * 10)
    hidden = tmp_path / "hidden.txt"
    hidden.write_bytes(b"x" * 20)
    file_attribute_hidden = 0x2
    ctypes.windll.kernel32.SetFileAttributesW(str(hidden), file_attribute_hidden)  # type: ignore[attr-defined]

    result = scanner.scan(tmp_path)
    names = {c.name for c in result.root.children}
    assert "visible.txt" in names
    assert "hidden.txt" not in names


@pytest.mark.skipif(sys.platform != "win32", reason="Windows FILE_ATTRIBUTE_HIDDEN only")
def test_scan_include_hidden_when_option_set(tmp_path: Path, scanner: DiskScanner) -> None:
    visible = tmp_path / "visible.txt"
    visible.write_bytes(b"x" * 10)
    hidden = tmp_path / "hidden.txt"
    hidden.write_bytes(b"x" * 20)
    file_attribute_hidden = 0x2
    ctypes.windll.kernel32.SetFileAttributesW(str(hidden), file_attribute_hidden)  # type: ignore[attr-defined]

    result = scanner.scan(tmp_path, options=ScanOptions(include_hidden=True))
    names = {c.name for c in result.root.children}
    assert "visible.txt" in names
    assert "hidden.txt" in names


# ---------------------------------------------------------------------------
# System file filtering  (Windows-specific)
# ---------------------------------------------------------------------------


@pytest.mark.skipif(sys.platform != "win32", reason="Windows FILE_ATTRIBUTE_SYSTEM only")
def test_scan_exclude_system_files_by_default(tmp_path: Path, scanner: DiskScanner) -> None:
    visible = tmp_path / "visible.txt"
    visible.write_bytes(b"x" * 10)
    sys_file = tmp_path / "sys_file.txt"
    sys_file.write_bytes(b"x" * 30)
    file_attribute_system = 0x4
    ctypes.windll.kernel32.SetFileAttributesW(str(sys_file), file_attribute_system)  # type: ignore[attr-defined]

    result = scanner.scan(tmp_path)
    names = {c.name for c in result.root.children}
    assert "visible.txt" in names
    assert "sys_file.txt" not in names


@pytest.mark.skipif(sys.platform != "win32", reason="Windows FILE_ATTRIBUTE_SYSTEM only")
def test_scan_include_system_files_when_option_set(tmp_path: Path, scanner: DiskScanner) -> None:
    visible = tmp_path / "visible.txt"
    visible.write_bytes(b"x" * 10)
    sys_file = tmp_path / "sys_file.txt"
    sys_file.write_bytes(b"x" * 30)
    file_attribute_system = 0x4
    ctypes.windll.kernel32.SetFileAttributesW(str(sys_file), file_attribute_system)  # type: ignore[attr-defined]

    result = scanner.scan(tmp_path, options=ScanOptions(include_system=True))
    names = {c.name for c in result.root.children}
    assert "visible.txt" in names
    assert "sys_file.txt" in names


# ---------------------------------------------------------------------------
# Inaccessible file (stat fails)
# ---------------------------------------------------------------------------


def test_scan_inaccessible_file_marked_accessible_false(
    tmp_path: Path, scanner: DiskScanner, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A file whose stat() raises should be recorded as accessible=False.

    Only raises for follow_symlinks=True (normal stat) to leave lstat() intact
    so that is_symlink() / is_dir() can still inspect the entry type.
    """
    bad_file = tmp_path / "bad.bin"
    bad_file.write_bytes(b"x" * 100)

    _real_stat = Path.stat

    def _patched_stat(self: Path, *, follow_symlinks: bool = True) -> os.stat_result:
        if self == bad_file and follow_symlinks:
            raise PermissionError("Access denied")
        return _real_stat(self, follow_symlinks=follow_symlinks)

    monkeypatch.setattr(Path, "stat", _patched_stat)

    result = scanner.scan(tmp_path)
    bad_node = next(c for c in result.root.children if c.name == "bad.bin")
    assert bad_node.accessible is False
    assert bad_node.size == 0
    assert result.error_count >= 1
