# Spec: M1 — Scanner Core

**Feature slug:** `m1-scanner-core`
**Date:** 2026-04-16
**Status:** Draft

---

## Problem

Argos has no scanning capability yet. The application can start and serve a health endpoint, but
it cannot read a filesystem path, compute directory sizes, or persist results. Without a scanner
there is no data, and without data there is no UI. This milestone delivers the engine that every
subsequent milestone depends on.

---

## Goals

- A `DiskScanner` class that recursively walks a directory tree and returns a complete in-memory
  representation of all files and folders with correct sizes.
- Symlinks and NTFS junction points are detected, never traversed, and excluded from parent size
  totals (per D-0002).
- Inaccessible paths (PermissionError, OSError) are recorded as nodes with `accessible=False`
  and a size of 0 — the scan never crashes.
- A progress callback lets callers know how many nodes have been processed so far (needed by
  the WebSocket layer in M2).
- A SQLite cache layer that stores completed scan results keyed on the root path, enabling
  instant re-open without re-scanning.
- Windows utility helpers (`is_link`, `is_admin`, hidden/system attribute detection) live in
  their own module so they can be tested independently and imported without side-effects.

---

## Non-Goals

- No API endpoints (M2).
- No WebSocket progress streaming (M2).
- No frontend changes (M3+).
- No UI for hidden/system file toggles (M3+).
- No deletion, no context menus (M8).
- No multiprocessing or Rust extension — benchmark first, optimize later if needed.

---

## User Stories

- As Argos, I want to scan a folder on disk so that I can report accurate sizes to the user.
- As Argos, I want to skip symlinks and junctions so that reported sizes match actual disk usage.
- As Argos, I want to mark inaccessible folders as errors (not crash) so the scan always completes.
- As Argos, I want to cache scan results in SQLite so that re-opening a folder is instant.
- As a developer, I want all logic covered by TDD tests so that regressions are caught immediately.

---

## Acceptance Criteria

**Scanner:**

1. Given a directory tree of known size, when `DiskScanner.scan(root)` is called,
   then `ScanResult.total_size` equals the sum of all file sizes (excluding link targets).

2. Given a directory containing a symlink, when the scan runs,
   then the symlink node has `is_link=True`, `node_type="symlink"`, and its content size
   is NOT added to its parent's total.

3. Given a directory where one sub-folder raises `PermissionError` on `os.scandir()`,
   when the scan runs, then the scan completes successfully, that folder node has
   `accessible=False`, its size is 0, and `ScanResult.error_count` is ≥ 1.

4. Given a `progress_callback` is passed to `scan()`, when the scan processes N nodes,
   then the callback is called at least once with a count > 0 and at most once per node.

5. Given `ScanOptions(include_hidden=False)` (the default), when a hidden file exists
   in the tree, then it does NOT appear in the results on Windows.

6. Given `ScanOptions(include_hidden=True)`, when a hidden file exists,
   then it DOES appear in the results.

**Cache:**

7. Given a completed `ScanResult`, when `ScanCache.put(result)` is called,
   then `ScanCache.get(root_path)` returns an equivalent `ScanResult`.

8. Given no prior scan for a path, when `ScanCache.get(path)` is called,
   then it returns `None`.

9. Given a prior cached scan, when `ScanCache.put(new_result)` is called for the same root,
   then `ScanCache.get` returns the new result (overwrite / upsert).

**Windows utils:**

10. Given a regular file, `is_link(path)` returns `False`.
11. Given a path that is a symlink (created with `os.symlink`), `is_link(path)` returns `True`.
12. `is_admin()` does not raise an exception regardless of privilege level.

---

## Open Questions

- None blocking M1.
