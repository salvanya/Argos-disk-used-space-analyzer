"""Recursive filesystem scanner for Argos.

The scanner is intentionally **synchronous**.  Filesystem syscalls are blocking
regardless of async wrappers; the performance bottleneck is kernel I/O, not
Python.  Async integration (e.g. for WebSocket progress updates) happens at the
API layer via ``asyncio.run_in_executor``, not here.
"""

from __future__ import annotations

import logging
import os
import time
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from backend.core.models import NodeType, ScanNode, ScanOptions, ScanResult
from backend.core.windows_utils import is_hidden, is_link, is_system_file

__all__ = ["DiskScanner"]

logger = logging.getLogger(__name__)


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

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

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
