"""SQLite-backed per-folder lazy-scan cache for Argos (M14).

One row per ``(root_path, folder_path, options_hash)`` triple: the user-picked
root a level belongs to, the folder this level describes, and a hash of the
:class:`ScanOptions` used so partials computed under different toggles don't
collide. The table holds the serialised :class:`LevelScanResult` JSON verbatim.

The M2 eager-scan schema (``scans`` table) is dropped on init — a one-time
ephemeral loss, acceptable because the cache is a perf aid and not user data.
"""

from __future__ import annotations

import logging
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from backend.core.errors import CacheError
from backend.core.models import LevelScanResult

__all__ = ["ScanCache"]

logger = logging.getLogger(__name__)

_DDL = """
CREATE TABLE IF NOT EXISTS scan_levels (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    root_path     TEXT    NOT NULL,
    folder_path   TEXT    NOT NULL,
    options_hash  TEXT    NOT NULL,
    scanned_at    TEXT    NOT NULL,
    result_json   TEXT    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_levels_key
    ON scan_levels(root_path, folder_path, options_hash);
CREATE INDEX IF NOT EXISTS idx_scan_levels_root
    ON scan_levels(root_path);
"""


def _as_posix(path: str | Path) -> str:
    """Normalise a path string or Path to a forward-slash absolute string."""
    return Path(path).as_posix() if isinstance(path, Path) else str(path)


class ScanCache:
    """Persist and retrieve :class:`~backend.core.models.LevelScanResult` objects.

    Args:
        db_path: Path to the SQLite database file. Created on first use.
    """

    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path
        self._init_db()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_level(
        self, root_path: str | Path, folder_path: str | Path, options_hash: str
    ) -> LevelScanResult | None:
        """Return the cached level for the given triple, or ``None`` if missing."""
        root_key = _as_posix(root_path)
        folder_key = _as_posix(folder_path)
        try:
            with self._connect() as conn:
                row = conn.execute(
                    "SELECT result_json FROM scan_levels "
                    "WHERE root_path = ? AND folder_path = ? AND options_hash = ?",
                    (root_key, folder_key, options_hash),
                ).fetchone()
        except sqlite3.Error as exc:
            raise CacheError(
                f"Failed to read level cache for {folder_key!r} under {root_key!r}: {exc}"
            ) from exc
        if row is None:
            return None
        return LevelScanResult.model_validate_json(row[0])

    def put_level(self, result: LevelScanResult) -> None:
        """Upsert *result* into the cache, keyed on (root_path, folder_path, options_hash)."""
        json_blob = result.model_dump_json()
        try:
            with self._connect() as conn:
                conn.execute(
                    """
                    INSERT INTO scan_levels
                        (root_path, folder_path, options_hash, scanned_at, result_json)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(root_path, folder_path, options_hash) DO UPDATE SET
                        scanned_at  = excluded.scanned_at,
                        result_json = excluded.result_json
                    """,
                    (
                        result.root_path,
                        result.folder_path,
                        result.options_hash,
                        result.scanned_at.isoformat(),
                        json_blob,
                    ),
                )
                conn.commit()
        except sqlite3.Error as exc:
            raise CacheError(
                f"Failed to write level cache for {result.folder_path!r}: {exc}"
            ) from exc

    def invalidate_level(
        self,
        root_path: str | Path,
        folder_path: str | Path,
        *,
        recursive: bool,
    ) -> None:
        """Remove the cached level at *folder_path*.

        When *recursive* is True, all descendants under *folder_path* (across every
        ``options_hash``) are also removed. Siblings whose names share a prefix
        (e.g. ``/root/foobar`` when invalidating ``/root/foo``) are NOT matched —
        the ``LIKE`` pattern requires a trailing slash segment.
        """
        root_key = _as_posix(root_path)
        folder_key = _as_posix(folder_path)
        try:
            with self._connect() as conn:
                if recursive:
                    conn.execute(
                        "DELETE FROM scan_levels "
                        "WHERE root_path = ? "
                        "  AND (folder_path = ? OR folder_path LIKE ? || '/%')",
                        (root_key, folder_key, folder_key),
                    )
                else:
                    conn.execute(
                        "DELETE FROM scan_levels "
                        "WHERE root_path = ? AND folder_path = ?",
                        (root_key, folder_key),
                    )
                conn.commit()
        except sqlite3.Error as exc:
            raise CacheError(
                f"Failed to invalidate level cache for {folder_key!r}: {exc}"
            ) from exc

    def clear(self) -> None:
        """Remove every cached level. Idempotent — no-op on an empty cache."""
        try:
            with self._connect() as conn:
                conn.execute("DELETE FROM scan_levels")
                conn.commit()
        except sqlite3.Error as exc:
            raise CacheError(f"Failed to clear cache: {exc}") from exc

    def list_roots(self) -> list[tuple[str, datetime, str]]:
        """Return ``(root_path, scanned_at, options_hash)`` for each cached root.

        A "root" is a row where ``folder_path == root_path`` — the user-picked
        scan starting point. When a root has been scanned under multiple option
        sets, only the most recent variant is returned.
        """
        try:
            with self._connect() as conn:
                rows = conn.execute(
                    """
                    WITH ranked AS (
                        SELECT root_path, scanned_at, options_hash,
                               ROW_NUMBER() OVER (
                                   PARTITION BY root_path
                                   ORDER BY scanned_at DESC
                               ) AS rn
                        FROM scan_levels
                        WHERE folder_path = root_path
                    )
                    SELECT root_path, scanned_at, options_hash
                    FROM ranked
                    WHERE rn = 1
                    ORDER BY scanned_at DESC
                    """
                ).fetchall()
        except sqlite3.Error as exc:
            raise CacheError(f"Failed to list cached roots: {exc}") from exc

        return [
            (row[0], datetime.fromisoformat(row[1]).replace(tzinfo=UTC), row[2])
            for row in rows
        ]

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self._db_path)

    def _init_db(self) -> None:
        try:
            with self._connect() as conn:
                # Migrate out the M2 eager-scan schema. Acceptable data loss —
                # the cache is a perf aid, users just re-scan their root.
                legacy = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='scans'"
                ).fetchone()
                if legacy is not None:
                    conn.execute("DROP TABLE scans")
                    logger.info("Dropped legacy 'scans' table from %s", self._db_path)
                conn.executescript(_DDL)
                conn.commit()
        except sqlite3.Error as exc:
            raise CacheError(
                f"Failed to initialise cache database at {self._db_path}: {exc}"
            ) from exc
