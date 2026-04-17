"""Pydantic data models for Argos."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class NodeType(StrEnum):
    file = "file"
    folder = "folder"
    symlink = "symlink"


class ScanOptions(BaseModel):
    include_hidden: bool = False
    include_system: bool = False


class ScanNode(BaseModel):
    name: str
    path: str  # absolute, forward-slash normalised
    node_type: NodeType
    size: int  # bytes; folders = sum of descendant file sizes; symlinks = 0
    accessible: bool
    is_link: bool
    link_target: str | None = None
    children: list[ScanNode] = []


# Required by Pydantic v2 to resolve the recursive forward reference.
ScanNode.model_rebuild()


class ScanResult(BaseModel):
    root: ScanNode
    scanned_at: datetime
    duration_seconds: float
    total_files: int  # count of NodeType.file nodes in the full tree
    total_folders: int  # count of NodeType.folder nodes (includes root)
    total_size: int  # == root.size
    error_count: int  # number of nodes with accessible=False
