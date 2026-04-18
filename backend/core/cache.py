"""SQLite-backed scan result cache for Argos.

Scan results are serialised as JSON blobs keyed on the normalised root path.
One row per unique root path; re-scanning overwrites the previous entry.

This module uses the stdlib ``sqlite3`` (synchronous).  The async ``aiosqlite``
upgrade will happen in M2 when the cache is called from inside FastAPI endpoints.
"""

from __future__ import annotations

import logging
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from backend.core.errors import CacheError
from backend.core.models import ScanResult

__all__ = ["ScanCache"]

logger = logging.getLogger(__name__)

_DDL = """
CREATE TABLE IF NOT EXISTS scans (
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_scans_root ON scans(root_path);
"""


class ScanCache:
    """Persist and retrieve :class:`~backend.core.models.ScanResult` objects.

    Args:
        db_path: Path to the SQLite database file.  Created on first use.
    """

    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path
        self._init_db()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get(self, root_path: Path) -> ScanResult | None:
        """Return the cached scan for *root_path*, or ``None`` if not found."""
        key = root_path.as_posix()
        try:
            with self._connect() as conn:
                row = conn.execute(
                    "SELECT tree_json FROM scans WHERE root_path = ?", (key,)
                ).fetchone()
        except sqlite3.Error as exc:
            raise CacheError(f"Failed to read cache for {key!r}: {exc}") from exc

        if row is None:
            return None
        return ScanResult.model_validate_json(row[0])

    def put(self, result: ScanResult) -> None:
        """Store *result* in the cache, overwriting any previous entry for the same root."""
        key = result.root.path
        json_blob = result.model_dump_json()
        try:
            with self._connect() as conn:
                conn.execute(
                    """
                    INSERT INTO scans
                        (root_path, scanned_at, duration_secs,
                         total_files, total_folders, total_size, error_count, tree_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(root_path) DO UPDATE SET
                        scanned_at    = excluded.scanned_at,
                        duration_secs = excluded.duration_secs,
                        total_files   = excluded.total_files,
                        total_folders = excluded.total_folders,
                        total_size    = excluded.total_size,
                        error_count   = excluded.error_count,
                        tree_json     = excluded.tree_json
                    """,
                    (
                        key,
                        result.scanned_at.isoformat(),
                        result.duration_seconds,
                        result.total_files,
                        result.total_folders,
                        result.total_size,
                        result.error_count,
                        json_blob,
                    ),
                )
                conn.commit()
        except sqlite3.Error as exc:
            raise CacheError(f"Failed to write cache for {key!r}: {exc}") from exc

    def delete(self, root_path: Path) -> None:
        """Remove the cached scan for *root_path*.  No-op if not present."""
        key = root_path.as_posix()
        try:
            with self._connect() as conn:
                conn.execute("DELETE FROM scans WHERE root_path = ?", (key,))
                conn.commit()
        except sqlite3.Error as exc:
            raise CacheError(f"Failed to delete cache for {key!r}: {exc}") from exc

    def clear(self) -> None:
        """Remove every cached scan.  Idempotent — no-op on an empty cache."""
        try:
            with self._connect() as conn:
                conn.execute("DELETE FROM scans")
                conn.commit()
        except sqlite3.Error as exc:
            raise CacheError(f"Failed to clear cache: {exc}") from exc

    def list_roots(self) -> list[tuple[str, datetime]]:
        """Return ``(root_path, scanned_at)`` pairs for every cached scan."""
        try:
            with self._connect() as conn:
                rows = conn.execute(
                    "SELECT root_path, scanned_at FROM scans ORDER BY scanned_at DESC"
                ).fetchall()
        except sqlite3.Error as exc:
            raise CacheError(f"Failed to list cached scans: {exc}") from exc

        return [(row[0], datetime.fromisoformat(row[1]).replace(tzinfo=UTC)) for row in rows]

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self._db_path)

    def _init_db(self) -> None:
        try:
            with self._connect() as conn:
                conn.executescript(_DDL)
                conn.commit()
        except sqlite3.Error as exc:
            raise CacheError(
                f"Failed to initialise cache database at {self._db_path}: {exc}"
            ) from exc
