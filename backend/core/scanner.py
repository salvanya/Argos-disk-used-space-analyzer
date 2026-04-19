"""Recursive filesystem scanner for Argos.

The scanner is intentionally **synchronous**.  Filesystem syscalls are blocking
regardless of async wrappers; the performance bottleneck is kernel I/O, not
Python.  Async integration (e.g. for WebSocket progress updates) happens at the
API layer via ``asyncio.run_in_executor``, not here.
"""

from __future__ import annotations

import fnmatch
import hashlib
import json
import logging
import os
import time
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from backend.core.models import (
    LevelScanNode,
    LevelScanResult,
    NodeType,
    ScanNode,
    ScanOptions,
    ScanResult,
)
from backend.core.windows_utils import is_hidden, is_link, is_system_file

__all__ = ["DiskScanner", "compute_options_hash"]

logger = logging.getLogger(__name__)


def _is_excluded(path: Path, globs: list[str]) -> bool:
    """Return True if *path* matches any of the exclusion *globs*.

    Matches against the forward-slashed absolute path so ``**/node_modules/**``
    works on every platform regardless of OS path separators.  A trailing
    ``/**`` is treated as also matching the directory itself so users can
    exclude ``node_modules`` and all of its descendants with a single glob.
    """
    posix = path.as_posix()
    for glob in globs:
        if fnmatch.fnmatch(posix, glob):
            return True
        if glob.endswith("/**") and fnmatch.fnmatch(posix, glob[:-3]):
            return True
    return False


def compute_options_hash(options: ScanOptions) -> str:
    """Return a short, stable hex digest for *options*.

    Used as part of the ScanCache key so partials computed under different
    option sets (e.g. include_hidden on vs off) don't collide.  The exclude
    list is sorted first so callers can pass the same globs in any order
    without invalidating the cache.
    """
    payload = {
        "include_hidden": options.include_hidden,
        "include_system": options.include_system,
        "exclude": sorted(options.exclude),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


class DiskScanner:
    """Walk a directory tree and return a complete :class:`~backend.core.models.ScanResult`.

    Usage::

        result = DiskScanner().scan(Path("C:/Users/me/Documents"))
    """

    def scan(
        self,
        root: Path,
        options: ScanOptions | None = None,
        progress_callback: Callable[[int], None] | None = None,
    ) -> ScanResult:
        """Scan *root* recursively and return the full tree.

        Args:
            root: The directory to scan.  Must be an existing path.
            options: Filtering options.  Defaults to ``ScanOptions()``.
            progress_callback: If provided, called with the running node count
                after each node is processed.  Useful for streaming progress to
                a WebSocket connection (see M2).

        Returns:
            A :class:`~backend.core.models.ScanResult` with the full tree and
            summary statistics.
        """
        if options is None:
            options = ScanOptions()

        # Mutable counters shared across the recursive walk.
        state = _WalkState()
        start = time.monotonic()
        root_node = self._walk(root, options, progress_callback, state)
        duration = time.monotonic() - start

        return ScanResult(
            root=root_node,
            scanned_at=datetime.now(tz=UTC),
            duration_seconds=duration,
            total_files=state.total_files,
            total_folders=state.total_folders,
            total_size=root_node.size,
            error_count=state.error_count,
        )

    def scan_level(
        self,
        folder_path: Path,
        options: ScanOptions | None = None,
        *,
        root_path: Path | None = None,
    ) -> LevelScanResult:
        """Return one folder's direct children (M14 lazy scan).

        Folder children come back with ``size=None`` — they are populated
        on a subsequent ``scan_level`` of that folder. Symlinks are returned
        as stubs and never followed. Exclusion globs, hidden-file and
        system-file filters all apply at this level identically to how they
        apply in :meth:`scan`.

        Args:
            folder_path: The directory to list. Must exist and be a real
                directory (not a file and not a symlink).
            options: Filtering options. Defaults to ``ScanOptions()``.
            root_path: The user-picked scan root that this level belongs to.
                Defaults to ``folder_path`` — used by the cache to group
                per-root entries together.

        Raises:
            FileNotFoundError: If *folder_path* does not exist.
            NotADirectoryError: If *folder_path* exists but is a file.

        Returns:
            :class:`~backend.core.models.LevelScanResult`. If ``os.scandir``
            on the target itself raises ``PermissionError``/``OSError`` the
            result has ``accessible=False`` and empty ``children`` — the
            scan does not raise.
        """
        if options is None:
            options = ScanOptions()
        effective_root = root_path if root_path is not None else folder_path
        options_hash = compute_options_hash(options)

        start = time.monotonic()

        # Symlink supplied as the scan target: degenerate case. We never
        # follow symlinks, so we can't list "inside" — surface it plainly
        # without raising so the UI can choose how to render.
        if is_link(folder_path):
            return LevelScanResult(
                root_path=effective_root.as_posix(),
                folder_path=folder_path.as_posix(),
                scanned_at=datetime.now(tz=UTC),
                duration_seconds=time.monotonic() - start,
                accessible=False,
                is_link=True,
                direct_files=0,
                direct_folders=0,
                direct_bytes_known=0,
                error_count=0,
                children=[],
                options_hash=options_hash,
            )

        if not folder_path.exists():
            raise FileNotFoundError(f"Path does not exist: {folder_path}")
        if not folder_path.is_dir():
            raise NotADirectoryError(f"Not a directory: {folder_path}")

        try:
            raw_entries = list(os.scandir(folder_path))
        except (PermissionError, OSError) as exc:
            logger.warning("Cannot list directory %s: %s", folder_path, exc)
            return LevelScanResult(
                root_path=effective_root.as_posix(),
                folder_path=folder_path.as_posix(),
                scanned_at=datetime.now(tz=UTC),
                duration_seconds=time.monotonic() - start,
                accessible=False,
                is_link=False,
                direct_files=0,
                direct_folders=0,
                direct_bytes_known=0,
                error_count=0,
                children=[],
                options_hash=options_hash,
            )

        children: list[LevelScanNode] = []
        direct_files = 0
        direct_folders = 0
        direct_bytes_known = 0
        error_count = 0

        for entry in raw_entries:
            entry_path = Path(entry.path)
            child = self._build_level_child(entry, entry_path, options)
            if child is None:
                continue
            children.append(child)
            if child.is_link:
                continue
            if child.node_type is NodeType.folder:
                direct_folders += 1
            else:
                direct_files += 1
                if child.accessible:
                    # size is guaranteed int for accessible files (see _build_level_child).
                    assert child.size is not None
                    direct_bytes_known += child.size
                else:
                    error_count += 1

        return LevelScanResult(
            root_path=effective_root.as_posix(),
            folder_path=folder_path.as_posix(),
            scanned_at=datetime.now(tz=UTC),
            duration_seconds=time.monotonic() - start,
            accessible=True,
            is_link=False,
            direct_files=direct_files,
            direct_folders=direct_folders,
            direct_bytes_known=direct_bytes_known,
            error_count=error_count,
            children=children,
            options_hash=options_hash,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_level_child(
        self,
        entry: os.DirEntry[str],
        entry_path: Path,
        options: ScanOptions,
    ) -> LevelScanNode | None:
        """Produce a single :class:`LevelScanNode` for *entry* or ``None`` if filtered."""
        # Symlink takes precedence — we never descend into links regardless of
        # what the DirEntry's is_dir() reports (it follows by default).
        if is_link(entry_path):
            try:
                link_target: str | None = str(entry_path.resolve())
            except OSError:
                link_target = None
            return LevelScanNode(
                name=entry.name,
                path=entry_path.as_posix(),
                node_type=NodeType.symlink,
                size=0,
                accessible=True,
                is_link=True,
                link_target=link_target,
            )

        if (
            (not options.include_hidden and is_hidden(entry_path))
            or (not options.include_system and is_system_file(entry_path))
            or (bool(options.exclude) and _is_excluded(entry_path, options.exclude))
        ):
            return None

        try:
            entry_is_dir = entry.is_dir()
        except OSError:
            entry_is_dir = False

        if entry_is_dir:
            return LevelScanNode(
                name=entry.name,
                path=entry_path.as_posix(),
                node_type=NodeType.folder,
                size=None,
                accessible=True,
                is_link=False,
            )

        try:
            size: int = entry_path.stat().st_size
            accessible = True
        except (PermissionError, OSError) as exc:
            logger.warning("Cannot stat file %s: %s", entry_path, exc)
            size = 0
            accessible = False

        return LevelScanNode(
            name=entry.name,
            path=entry_path.as_posix(),
            node_type=NodeType.file,
            size=size,
            accessible=accessible,
            is_link=False,
        )

    def _walk(
        self,
        path: Path,
        options: ScanOptions,
        progress_callback: Callable[[int], None] | None,
        state: _WalkState,
    ) -> ScanNode:
        state.node_count += 1
        if progress_callback is not None:
            progress_callback(state.node_count)

        name = path.name or str(path)
        path_str = path.as_posix()

        # --- Symlink / junction: never traverse ---
        if is_link(path):
            try:
                link_target: str | None = str(path.resolve())
            except OSError:
                link_target = None
            return ScanNode(
                name=name,
                path=path_str,
                node_type=NodeType.symlink,
                size=0,
                accessible=True,
                is_link=True,
                link_target=link_target,
            )

        # --- Determine whether this is a directory ---
        try:
            node_is_dir = path.is_dir()
        except OSError:
            node_is_dir = False

        if node_is_dir:
            return self._walk_dir(path, name, path_str, options, progress_callback, state)
        return self._walk_file(path, name, path_str, state)

    def _walk_dir(
        self,
        path: Path,
        name: str,
        path_str: str,
        options: ScanOptions,
        progress_callback: Callable[[int], None] | None,
        state: _WalkState,
    ) -> ScanNode:
        state.total_folders += 1

        try:
            raw_entries = list(os.scandir(path))
        except (PermissionError, OSError) as exc:
            logger.warning("Cannot list directory %s: %s", path, exc)
            state.error_count += 1
            return ScanNode(
                name=name,
                path=path_str,
                node_type=NodeType.folder,
                size=0,
                accessible=False,
                is_link=False,
            )

        children: list[ScanNode] = []
        for entry in raw_entries:
            entry_path = Path(entry.path)

            # Apply hidden/system filters only to non-link entries.
            # Links get their own node type and are never size-counted, so
            # filtering them here would hide them from the tree entirely.
            if not is_link(entry_path):
                if not options.include_hidden and is_hidden(entry_path):
                    continue
                if not options.include_system and is_system_file(entry_path):
                    continue

            if options.exclude and _is_excluded(entry_path, options.exclude):
                continue

            child = self._walk(entry_path, options, progress_callback, state)
            children.append(child)

        # Folder size = sum of descendant file sizes; links excluded entirely.
        folder_size = sum(c.size for c in children if not c.is_link)

        return ScanNode(
            name=name,
            path=path_str,
            node_type=NodeType.folder,
            size=folder_size,
            accessible=True,
            is_link=False,
            children=children,
        )

    def _walk_file(
        self,
        path: Path,
        name: str,
        path_str: str,
        state: _WalkState,
    ) -> ScanNode:
        state.total_files += 1
        try:
            size = path.stat().st_size
        except (PermissionError, OSError) as exc:
            logger.warning("Cannot stat file %s: %s", path, exc)
            state.error_count += 1
            return ScanNode(
                name=name,
                path=path_str,
                node_type=NodeType.file,
                size=0,
                accessible=False,
                is_link=False,
            )
        return ScanNode(
            name=name,
            path=path_str,
            node_type=NodeType.file,
            size=size,
            accessible=True,
            is_link=False,
        )


class _WalkState:
    """Mutable counters threaded through the recursive walk."""

    __slots__ = ("error_count", "node_count", "total_files", "total_folders")

    def __init__(self) -> None:
        self.node_count: int = 0
        self.total_files: int = 0
        self.total_folders: int = 0
        self.error_count: int = 0
