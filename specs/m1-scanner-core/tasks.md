# Tasks: M1 — Scanner Core

**Feature slug:** `m1-scanner-core`
**Date:** 2026-04-16
**Status:** Pending approval

---

## Phase 0 — Models (prerequisite, no test needed)

- [ ] Add `NodeType`, `ScanNode`, `ScanResult`, `ScanOptions` to `backend/core/models.py`
      _(Models are data containers; tested implicitly by scanner/cache tests.)_

---

## Phase 1 — Tests (Red)

### Windows utils tests (`tests/unit/test_windows_utils.py`)
- [ ] `test_is_link_returns_false_for_regular_file`
- [ ] `test_is_link_returns_true_for_symlink` _(skip if no symlink privilege)_
- [ ] `test_is_admin_returns_bool_without_raising`
- [ ] `test_is_hidden_returns_false_for_normal_file`
- [ ] `test_is_hidden_returns_true_for_hidden_file` _(Windows-only; set attr via ctypes)_

### Scanner tests (`tests/unit/test_scanner.py`)
- [ ] `test_scan_single_file` — one file, correct size and node_type
- [ ] `test_scan_empty_folder` — size=0, children=[]
- [ ] `test_scan_nested_tree` — folder size = sum of descendants
- [ ] `test_scan_symlink_file_excluded_from_parent_size` _(skip if no symlink privilege)_
- [ ] `test_scan_symlink_dir_not_traversed` _(skip if no symlink privilege)_
- [ ] `test_scan_inaccessible_dir_marked_accessible_false`
- [ ] `test_scan_inaccessible_dir_does_not_raise`
- [ ] `test_scan_error_count_incremented_for_inaccessible`
- [ ] `test_scan_progress_callback_called`
- [ ] `test_scan_progress_callback_monotonically_increasing`
- [ ] `test_scan_exclude_hidden_by_default` _(Windows-only)_
- [ ] `test_scan_include_hidden_when_option_set` _(Windows-only)_
- [ ] `test_scan_result_total_size_equals_root_node_size`
- [ ] `test_scan_result_total_files_count`
- [ ] `test_scan_result_total_folders_count`

### Cache tests (`tests/unit/test_cache.py`)
- [ ] `test_get_returns_none_when_cache_empty`
- [ ] `test_put_then_get_returns_equivalent_result`
- [ ] `test_put_twice_same_root_upserts`
- [ ] `test_delete_then_get_returns_none`
- [ ] `test_list_roots_returns_all_stored_roots`
- [ ] `test_list_roots_empty_when_no_scans`

---

## Phase 2 — Implementation (Green)

### Windows utils (`backend/core/windows_utils.py`)
- [ ] Implement `is_link(path)` using `is_symlink()` + `is_junction()` + ctypes fallback
      _(copy pattern from `lessons/windows-junction-detection.md` exactly)_
- [ ] Implement `is_admin()` — `ctypes.windll.shell32.IsUserAnAdmin()` on Windows, `False` elsewhere
- [ ] Implement `get_file_attributes(path)` — `GetFileAttributesW` on Windows, `0` elsewhere
- [ ] Implement `is_hidden(path)` — check `FILE_ATTRIBUTE_HIDDEN` bit
- [ ] Implement `is_system_file(path)` — check `FILE_ATTRIBUTE_SYSTEM` bit

### Models (`backend/core/models.py`)
- [ ] All model tests pass (they're tested via scanner/cache, so this just means no import errors)

### Scanner (`backend/core/scanner.py`)
- [ ] Implement `DiskScanner.scan()` skeleton (accept args, return empty `ScanResult`) → some tests green
- [ ] Implement single-level `os.scandir()` loop — files become leaf `ScanNode`s
- [ ] Implement recursion into subdirectories (non-links, accessible)
- [ ] Implement `is_link()` check — create symlink node, do NOT recurse
- [ ] Implement `PermissionError` / `OSError` catch — mark node `accessible=False`
- [ ] Implement bottom-up folder size computation
- [ ] Implement `progress_callback` emission (every N nodes or every node — every node is fine for M1)
- [ ] Implement `include_hidden` filtering via `is_hidden()`
- [ ] Populate `ScanResult` totals (`total_files`, `total_folders`, `total_size`, `error_count`, `duration_seconds`)

### Cache (`backend/core/cache.py`)
- [ ] Implement `ScanCache.__init__()` — open/create SQLite DB, run `CREATE TABLE IF NOT EXISTS`
- [ ] Implement `ScanCache.put()` — serialize `ScanResult` to JSON, `INSERT OR REPLACE`
- [ ] Implement `ScanCache.get()` — query by `root_path`, deserialize JSON, return `ScanResult | None`
- [ ] Implement `ScanCache.delete()` — `DELETE WHERE root_path = ?`
- [ ] Implement `ScanCache.list_roots()` — `SELECT root_path, scanned_at`

---

## Phase 3 — Refactor

- [ ] Extract `_walk_dir(path, options, callback)` as a private helper in `scanner.py`
      if the main `scan()` body exceeds ~60 lines
- [ ] Ensure all public functions have complete type annotations (mypy strict will catch gaps)
- [ ] Add `__all__` to each new module
- [ ] Review ruff output; fix any remaining lint issues

---

## Phase 4 — Verify & Commit

- [ ] Run full test suite: `pytest --cov=backend --cov-report=term-missing`
      → all tests green, coverage ≥ 85% on `backend/core/`
- [ ] Run linter: `ruff check . && ruff format --check .`
- [ ] Run type checker: `mypy backend/core/`
- [ ] Manual smoke test (see plan.md §Testing Strategy)
- [ ] Conventional commit: `feat(m1-scanner-core): recursive scanner, SQLite cache, Windows utils (see specs/m1-scanner-core)`
- [ ] Update `specs/m1-scanner-core/tasks.md` status → Completed
- [ ] Update `.claude/memory/current.md` — point next session at M2

---

## Done Definition

All boxes above are checked AND:
- `pytest` exits 0 with coverage ≥ 85%.
- `ruff check .` exits 0.
- `mypy backend/core/` exits 0.
- No `print()` statements in committed code.
