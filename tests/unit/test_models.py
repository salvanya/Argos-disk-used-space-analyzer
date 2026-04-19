"""Unit tests for M14 LevelScan* Pydantic models (TDD — red phase)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from backend.core.models import (
    LevelInvalidateRequest,
    LevelScanNode,
    LevelScanRequest,
    LevelScanResult,
    NodeType,
    ScanOptions,
)


def test_level_scan_node_folder_size_nullable() -> None:
    """Folder children come back with size=None in pure-lazy mode."""
    node = LevelScanNode(
        name="Windows",
        path="C:/Windows",
        node_type=NodeType.folder,
        size=None,
        accessible=True,
        is_link=False,
    )
    assert node.size is None
    assert node.node_type is NodeType.folder


def test_level_scan_node_file_with_numeric_size_validates() -> None:
    """Files produced by scan_level carry a real stat'd size."""
    node = LevelScanNode(
        name="notepad.exe",
        path="C:/Windows/notepad.exe",
        node_type=NodeType.file,
        size=245_760,
        accessible=True,
        is_link=False,
    )
    assert node.size == 245_760


def test_level_scan_node_symlink_fields() -> None:
    """Symlinks carry the resolved target without being followed."""
    node = LevelScanNode(
        name="junction",
        path="C:/link",
        node_type=NodeType.symlink,
        size=0,
        accessible=True,
        is_link=True,
        link_target="C:/real/target",
    )
    assert node.is_link is True
    assert node.link_target == "C:/real/target"


def test_level_scan_result_roundtrip() -> None:
    """LevelScanResult survives JSON round-trip unchanged."""
    original = LevelScanResult(
        root_path="C:/Users/me",
        folder_path="C:/Users/me/Documents",
        scanned_at=datetime(2026, 4, 19, 12, 0, 0, tzinfo=UTC),
        duration_seconds=0.042,
        accessible=True,
        is_link=False,
        direct_files=3,
        direct_folders=2,
        direct_bytes_known=1024,
        error_count=0,
        children=[
            LevelScanNode(
                name="a.txt",
                path="C:/Users/me/Documents/a.txt",
                node_type=NodeType.file,
                size=512,
                accessible=True,
                is_link=False,
            ),
            LevelScanNode(
                name="Sub",
                path="C:/Users/me/Documents/Sub",
                node_type=NodeType.folder,
                size=None,
                accessible=True,
                is_link=False,
            ),
        ],
        options_hash="abcdef0123456789",
    )
    blob = original.model_dump_json()
    restored = LevelScanResult.model_validate_json(blob)
    assert restored == original
    # Explicit: null size survives the round trip (pydantic never coerces to 0).
    assert restored.children[1].size is None


def test_level_scan_request_defaults() -> None:
    """LevelScanRequest defaults options to ScanOptions() and force_rescan to False."""
    req = LevelScanRequest(root="C:/Users/me", path="C:/Users/me/Documents")
    assert req.options == ScanOptions()
    assert req.force_rescan is False


def test_level_invalidate_request_recursive_default_true() -> None:
    """Per spec Resolution §5, per-folder rescan defaults to wiping descendants too."""
    req = LevelInvalidateRequest(root="C:/Users/me", path="C:/Users/me/Documents")
    assert req.recursive is True


def test_level_invalidate_request_recursive_opt_out() -> None:
    """Clients can explicitly keep descendants."""
    req = LevelInvalidateRequest(
        root="C:/Users/me",
        path="C:/Users/me/Documents",
        recursive=False,
    )
    assert req.recursive is False


def test_level_scan_node_rejects_negative_size() -> None:
    """Sizes must be non-negative when present (pydantic coerces int-like,
    but -1 is nonsense from stat and should surface as a validation error)."""
    with pytest.raises(ValueError):
        LevelScanNode(
            name="bad",
            path="C:/bad",
            node_type=NodeType.file,
            size=-1,
            accessible=True,
            is_link=False,
        )
