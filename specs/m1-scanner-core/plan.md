# Plan: M1 — Scanner Core

**Feature slug:** `m1-scanner-core`
**Date:** 2026-04-16
**Status:** Draft

---

## Architecture Overview

The scanner is a **synchronous** engine built around `os.scandir()`. Synchronous is the right
call here: filesystem syscalls are blocking regardless, and the performance bottleneck is kernel
I/O, not Python. Async wrapping (for WebSocket progress in M2) happens at the API layer via
`asyncio.run_in_executor`, not inside the scanner itself. This keeps the scanner simple,
stack-traceable, and trivially testable without any asyncio machinery.

The tree is represented as a recursive Pydantic model (`ScanNode`). Each folder's `size` is
the sum of all descendant file sizes, computed bottom-up during the walk. Symlink and junction
sizes are never added to parent totals.

The cache serializes the entire `ScanResult` to a JSON blob stored in a single SQLite table.
A UNIQUE index on `root_path` means a re-scan simply overwrites the previous entry. This is
intentionally simple — normalization and partial updates are deferred until benchmarks show a
need.

---

## Files Affected

### New files

| File | Purpose |
|---|---|
| `backend/core/scanner.py` | `DiskScanner`, `ScanOptions`; the recursive walk engine |
| `backend/core/cache.py` | `ScanCache`; SQLite read/write; `aiosqlite` for the async API surface in M2 |
| `backend/core/windows_utils.py` | `is_link()`, `is_admin()`, `get_file_attributes()` |
| `tests/unit/test_scanner.py` | TDD unit tests for the scanner |
| `tests/unit/test_cache.py` | TDD unit tests for the cache |
| `tests/unit/test_windows_utils.py` | TDD unit tests for Windows utils |

### Modified files

| File | Change |
|---|---|
| `backend/core/models.py` | Add `NodeType`, `ScanNode`, `ScanResult`, `ScanOptions` Pydantic models |
| `tests/conftest.py` | Add `fixture_tree` helper that builds a small directory tree under `tmp_path` |

---

## Data Model Changes

```python
# backend/core/models.py

class NodeType(str, Enum):
    file = "file"
    folder = "folder"
    symlink = "symlink"   # covers both POSIX symlinks and NTFS junctions

class ScanNode(BaseModel):
    name: str
    path: str               # absolute, forward-slash normalized
    node_type: NodeType
    size: int               # bytes; folders = sum of descendant file sizes; links = 0
    accessible: bool        # False if PermissionError / OSError on entry
    is_link: bool
    link_target: str | None = None   # resolved target path (informational)
    children: list["ScanNode"] = []

class ScanResult(BaseModel):
    root: ScanNode
    scanned_at: datetime
    duration_seconds: float
    total_files: int
    total_folders: int
    total_size: int         # == root.size
    error_count: int        # number of nodes with accessible=False

class ScanOptions(BaseModel):
    include_hidden: bool = False
    include_system: bool = False
    # follow_symlinks is intentionally absent — always False (D-0002)
```

---

## API Surface

No HTTP endpoints in M1. The public Python API is:

```python
# backend/core/scanner.py
class DiskScanner:
    def scan(
        self,
        root: Path,
        options: ScanOptions | None = None,
        progress_callback: Callable[[int], None] | None = None,
    ) -> ScanResult: ...

# backend/core/cache.py
class ScanCache:
    def __init__(self, db_path: Path) -> None: ...
    def get(self, root_path: Path) -> ScanResult | None: ...
    def put(self, result: ScanResult) -> None: ...
    def delete(self, root_path: Path) -> None: ...
    def list_roots(self) -> list[tuple[str, datetime]]: ...

# backend/core/windows_utils.py
def is_link(path: Path) -> bool: ...
def is_admin() -> bool: ...
def get_file_attributes(path: Path) -> int: ...   # raw Windows attrs; 0 on non-Windows
def is_hidden(path: Path) -> bool: ...
def is_system_file(path: Path) -> bool: ...
```

---

## SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS scans (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    root_path      TEXT    NOT NULL,
    scanned_at     TEXT    NOT NULL,   -- ISO 8601 UTC
    duration_secs  REAL    NOT NULL,
    total_files    INTEGER NOT NULL,
    total_folders  INTEGER NOT NULL,
    total_size     INTEGER NOT NULL,
    error_count    INTEGER NOT NULL,
    tree_json      TEXT    NOT NULL    -- full ScanResult.model_dump_json()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scans_root ON scans(root_path);
```

The `tree_json` column stores the entire `ScanResult` serialized to JSON. Upserts use
`INSERT OR REPLACE INTO scans ...` keyed on `root_path`.

---

## Testing Strategy

### Unit tests — `tests/unit/test_scanner.py`

All tests use real directories created via `tmp_path` (pytest's built-in fixture). No mocking
of the filesystem. Symlink tests are guarded with a helper that checks whether the current
process can create symlinks (admin or Developer Mode on Windows).

Key scenarios:
- Single file → correct size, `node_type=file`.
- Empty folder → size=0, no children.
- Nested tree → folder sizes computed bottom-up.
- Symlink file → `is_link=True`, size excluded from parent.
- Symlink dir → `is_link=True`, contents NOT traversed.
- Inaccessible dir → `accessible=False`, size=0, `error_count` incremented.
- `progress_callback` called with rising counts.
- `include_hidden=False` (default) → hidden file absent from results.
- `include_hidden=True` → hidden file present.

### Unit tests — `tests/unit/test_cache.py`

Uses `tmp_path` for the SQLite DB file. Key scenarios:
- `get()` on empty cache → `None`.
- `put()` then `get()` → equal result.
- Double `put()` same root → second value returned (upsert).
- `delete()` then `get()` → `None`.
- `list_roots()` returns one entry per unique root.

### Unit tests — `tests/unit/test_windows_utils.py`

- `is_link` on regular file → `False`.
- `is_link` on `os.symlink` target → `True` (guarded: skip if no symlink privilege).
- `is_admin()` returns bool, never raises.
- `is_hidden()` on a file with no hidden attr → `False`.
- `is_hidden()` on a file with hidden attr set (Windows only, set via `ctypes`) → `True`.

### Integration

No integration tests in M1 (no HTTP surface yet). The `tests/integration/` folder will be
populated in M2.

### Coverage gate

`fail_under = 85` in `pyproject.toml` already enforces this. Target is ≥ 90% on
`backend/core/` for M1 since the modules are pure logic with no UI or network.

### Manual verification

```
python -c "
from pathlib import Path
from backend.core.scanner import DiskScanner
result = DiskScanner().scan(Path('tests/fixtures'))
print(result.total_files, result.total_size)
"
```

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Creating symlinks in tests requires admin/developer mode on Windows → tests silently skip | Add a `can_create_symlink()` helper in `conftest.py`; use `@pytest.mark.skipif` on affected tests; document in test docstring |
| NTFS junction points not covered by `is_symlink()` → double-counting | Use the `is_link()` helper from `lessons/windows-junction-detection.md` — covers both symlinks and junctions; tested directly in `test_windows_utils.py` |
| `os.scandir()` on Windows returns `DirEntry` where `stat()` raises for reparse points | Wrap every `entry.stat()` call in `try/except OSError` in the scanner |
| JSON blob for 1M-file tree could be 50–100 MB in SQLite | Acceptable for M1. Benchmark in M1 and add gzip compression in M2 if needed |
| `aiosqlite` is async but `ScanCache.get/put` are synchronous in this plan | `ScanCache` is synchronous in M1 (uses stdlib `sqlite3`). Switch to `aiosqlite` in M2 when it runs inside an async FastAPI endpoint |
| `mypy --strict` on `backend/core/` will flag recursive `ScanNode` type | Use `model_rebuild()` after class definition to resolve forward reference; standard Pydantic v2 pattern |
| `ruff` `TRY` rules flag broad `except Exception` | Catch specific exceptions (`PermissionError`, `OSError`); use `TRY003` ignore only where warranted |

---

## Rollback Plan

M1 adds only new files plus an edit to `backend/core/models.py` (which was a placeholder).
Rolling back means `git revert` on the M1 commit(s). Nothing in M0 depends on M1 code.

---

## Out of Scope for M1

- HTTP endpoints (M2).
- WebSocket progress (M2).
- Admin relaunch (M12).
- Deletion (M8).
- `include_system` file filtering (deferred — implement alongside hidden in M1 if trivial, otherwise defer).
