"""Pydantic data models for Argos."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Literal

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


# ---------------------------------------------------------------------------
# API request / response models
# ---------------------------------------------------------------------------


class ScanStartRequest(BaseModel):
    root: str  # absolute path; will be coerced to Path in the endpoint
    options: ScanOptions = ScanOptions()
    force_rescan: bool = False


class ScanSummary(BaseModel):
    """Flat summary returned by GET /api/scans (no tree blob)."""

    root_path: str
    scanned_at: datetime
    total_files: int
    total_folders: int
    total_size: int
    error_count: int
    duration_seconds: float


# ---------------------------------------------------------------------------
# WebSocket message envelope — discriminated union on the `type` field
# ---------------------------------------------------------------------------


class WsProgressMessage(BaseModel):
    type: Literal["progress"] = "progress"
    node_count: int


class WsCompleteMessage(BaseModel):
    type: Literal["complete"] = "complete"
    result: ScanResult


class WsErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    message: str


# ---------------------------------------------------------------------------
# System / config models
# ---------------------------------------------------------------------------


class AppConfig(BaseModel):
    token: str


class SystemInfo(BaseModel):
    is_admin: bool
    platform: str


class FolderPickerResponse(BaseModel):
    path: str | None


# ---------------------------------------------------------------------------
# Filesystem operation request models
# ---------------------------------------------------------------------------


class OpenRequest(BaseModel):
    path: str


class DeleteRequest(BaseModel):
    path: str
    permanent: bool = False
    confirm: bool
