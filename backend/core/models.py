"""Pydantic data models for Argos."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator


class NodeType(StrEnum):
    file = "file"
    folder = "folder"
    symlink = "symlink"


class ScanOptions(BaseModel):
    include_hidden: bool = False
    include_system: bool = False
    exclude: list[str] = []

    @field_validator("exclude")
    @classmethod
    def _validate_exclude(cls, value: list[str]) -> list[str]:
        for glob in value:
            if not glob or not glob.strip():
                raise ValueError("exclusion glob must be a non-empty string")
        return value


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
# M14 lazy-scanning models — one folder, direct children only
# ---------------------------------------------------------------------------


class LevelScanNode(BaseModel):
    """One direct child produced by :meth:`DiskScanner.scan_level`.

    ``size`` is ``None`` for folders (pure-lazy — size is only known once the
    folder is itself ``scan_level``'d) and a non-negative ``int`` for files.
    Symlinks carry ``size=0`` and are never followed.
    """

    name: str
    path: str  # absolute, forward-slash normalised
    node_type: NodeType
    size: Annotated[int, Field(ge=0)] | None
    accessible: bool
    is_link: bool
    link_target: str | None = None


class LevelScanResult(BaseModel):
    """A single level of a lazy scan — the folder plus its direct children."""

    root_path: str  # the user-picked root this level belongs to
    folder_path: str  # the specific folder this level describes
    scanned_at: datetime
    duration_seconds: float
    accessible: bool  # False if os.scandir on this folder itself failed
    is_link: bool  # degenerate case; symlinks normally never become a level target
    direct_files: int
    direct_folders: int
    direct_bytes_known: int  # sum of file-child sizes; folders contribute 0
    error_count: int  # direct children with accessible=False
    children: list[LevelScanNode]
    options_hash: str  # echoed for clients that want to key their own cache


class LevelScanRequest(BaseModel):
    """Body of ``POST /api/scan/level``."""

    root: str
    path: str
    options: ScanOptions = ScanOptions()
    force_rescan: bool = False


class LevelInvalidateRequest(BaseModel):
    """Body of ``DELETE /api/scan/level``.

    Per spec Resolution §5 the default wipes the target plus all descendants;
    clients opt out with ``recursive=False`` to keep descendants.
    """

    root: str
    path: str
    recursive: bool = True


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
