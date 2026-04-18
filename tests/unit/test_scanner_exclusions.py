"""Tests for the ``ScanOptions.exclude`` glob-based exclusion mechanism."""

from __future__ import annotations

from pathlib import Path

import pytest
from backend.core.models import ScanOptions
from backend.core.scanner import DiskScanner


@pytest.fixture()
def scanner() -> DiskScanner:
    return DiskScanner()


@pytest.fixture()
def tree(tmp_path: Path) -> Path:
    """Build a small fixture tree.

    tmp_path/
      a/
        node_modules/
          x.txt           (10 bytes)
        src/
          y.py            (20 bytes)
      b/
        .cache/
          z.bin           (40 bytes)
    """
    (tmp_path / "a" / "node_modules").mkdir(parents=True)
    (tmp_path / "a" / "node_modules" / "x.txt").write_bytes(b"x" * 10)
    (tmp_path / "a" / "src").mkdir()
    (tmp_path / "a" / "src" / "y.py").write_bytes(b"y" * 20)
    (tmp_path / "b" / ".cache").mkdir(parents=True)
    (tmp_path / "b" / ".cache" / "z.bin").write_bytes(b"z" * 40)
    return tmp_path


def test_no_exclusions_yields_full_tree(tree: Path, scanner: DiskScanner) -> None:
    result = scanner.scan(tree, ScanOptions())
    assert result.total_files == 3
    assert result.total_size == 70


def test_exclude_node_modules_glob(tree: Path, scanner: DiskScanner) -> None:
    result = scanner.scan(tree, ScanOptions(exclude=["**/node_modules/**"]))
    # node_modules removed entirely; x.txt's 10 bytes gone
    assert result.total_files == 2
    assert result.total_size == 60
    names = _collect_names(result.root)
    assert "node_modules" not in names
    assert "x.txt" not in names


def test_exclude_multiple_globs_compose(tree: Path, scanner: DiskScanner) -> None:
    result = scanner.scan(
        tree, ScanOptions(exclude=["**/node_modules/**", "**/.cache/**"])
    )
    assert result.total_files == 1  # only y.py survives
    assert result.total_size == 20


def test_exclude_file_by_extension(tree: Path, scanner: DiskScanner) -> None:
    result = scanner.scan(tree, ScanOptions(exclude=["**/*.bin"]))
    assert result.total_files == 2  # x.txt + y.py
    assert result.total_size == 30
    assert "z.bin" not in _collect_names(result.root)


def test_exclude_ancestor_size_drops_accordingly(tree: Path, scanner: DiskScanner) -> None:
    result = scanner.scan(tree, ScanOptions(exclude=["**/node_modules/**"]))
    a_node = next(c for c in result.root.children if c.name == "a")
    # a/ previously held node_modules (10) + src (20) = 30; now just src
    assert a_node.size == 20


def test_invalid_exclude_glob_rejected_by_pydantic() -> None:
    # Empty-string globs are meaningless and should be rejected to avoid silent no-ops.
    with pytest.raises(ValueError):
        ScanOptions(exclude=[""])


def _collect_names(node: object) -> set[str]:
    names: set[str] = set()
    stack = [node]
    while stack:
        n = stack.pop()
        names.add(n.name)  # type: ignore[attr-defined]
        stack.extend(n.children)  # type: ignore[attr-defined]
    return names
