# Spec: M14 — Lazy (On-Demand) Scanning

## Problem
The current scanner (`backend/core/scanner.DiskScanner.scan`) walks the entire subtree of the chosen root eagerly, returning a complete `ScanResult` only when every file and folder has been stat'd. For large roots like `C:\` (hundreds of GB, millions of inodes), this means:
- First paint is blocked for minutes — unacceptable UX even with the WebSocket progress bar from M2.
- Memory grows proportionally to the entire tree even when the user only cares about the top level.
- A single permission wall or slow symlink-looking node anywhere deep in the tree delays the whole first render.

CLAUDE.md §2.4 mandates "Complete scan (not lazy/progressive)", but that requirement predates real-world testing on large disks — the user has now hit the pain and wants lazy scanning instead. This spec documents that reversal and defines the new scanning model.

## Goals
- The initial scan of a root returns only the **direct children** (files + folders) of that root. File children have a known size (from `stat`); folder children are returned as stubs with unknown size (pure-lazy model — see Resolutions §1). A folder child's size becomes known only when that folder is itself `scan_level`'d.
- Expanding a folder (in the tree on the left, or clicking/focusing it in the middle column, or clicking a sphere in the 3D view) triggers a per-folder scan of its direct children — not a full subtree walk.
- Percentages displayed in the tree, middle column, and insights are computed relative to the currently-known siblings at that level; they update as more levels are scanned.
- The SQLite cache stores per-folder partial results, keyed by absolute path, with an "expanded-at" timestamp so stale partial results can be re-fetched.
- Rescan invalidates the per-folder cache for the target path and (optionally) all its descendants.
- The API gains a new endpoint for per-folder scans; the existing full-scan endpoint is removed (see Resolutions §2).
- WebSocket progress continues to work for any in-flight per-folder scan.

## Non-Goals
- No change to the filesystem safety rules: symlinks are still never followed; inaccessible folders still never crash; hidden/system files still respect the user toggle.
- No background pre-fetch beyond what this spec explicitly chooses in the resolution of Open Question 1 (pure lazy vs. lazy-first + background refine).
- No change to how deletion, open-in-explorer, or the 3D view's interaction model work — only the *data supply* changes.
- No change to the admin elevation flow, settings panel, or exclusions — those continue to apply to every per-folder scan equally.
- No multi-root scans / federated scans. A scan is still scoped to one user-chosen root; laziness only changes how the subtree is revealed.

## User Stories
- As a user who picks `C:\`, I see the direct children of `C:\` within a second or two, with their individual sizes (if we choose the "deep-but-deferred" model) or as folder stubs (if we choose the "pure lazy" model). Either way I am not blocked for minutes.
- As a user expanding `C:\Windows`, I wait only for `C:\Windows` to be scanned one level deep, not the whole tree beneath it.
- As a user in the 3D view, I see the root's children as spheres; clicking a sphere expands it (scans its children and adds them to the graph).
- As a user re-opening the app, I see the previous scan's top-level results instantly from the cache; expanding a subfolder reuses its cached partial result if still valid.
- As a user forcing a rescan, the targeted folder's cached partial is discarded and re-fetched; other cached folders are untouched unless I explicitly clear the whole cache from the Settings panel.

## Acceptance Criteria

### Scanner core
- A new `DiskScanner.scan_level(path, options) -> LevelScanResult` returns: the path itself, its direct children (files + folders), per-file size from `stat`, folder children with `size=None` (pure-lazy — populated only when that folder is itself `scan_level`'d), flags for symlink / accessible / hidden-or-system, and aggregate stats for this level only (`direct_files`, `direct_folders`, `direct_bytes_known`).
- The scanner never descends below the requested level when `scan_level` is called.
- All existing safety guarantees (symlink detection, permission handling, exclusion globs from M12) are preserved.
- `DiskScanner.scan` (full subtree) remains available and unchanged in core for tests, benchmarks, or an optional future "deep-scan this folder" feature; it is no longer wired to any HTTP endpoint.

### Cache
- The `ScanCache` schema adds (or repurposes) a per-folder row keyed by `(root_path, folder_path)` with `children_json`, `scanned_at`, `options_hash`.
- `ScanCache.get_level(folder_path, options)` returns the cached `LevelScanResult` or `None`.
- `ScanCache.put_level(folder_path, options, result)` upserts the row.
- `ScanCache.invalidate_level(folder_path, recursive: bool)` deletes the row and, when recursive, every descendant row.
- `DELETE /api/scans` (introduced in M12) continues to wipe everything.

### API
- `POST /api/scan/level` with body `{ path: string, options: ScanOptions }` returns a `LevelScanResult`. Cached results are returned when fresh; otherwise a fresh scan runs and is cached.
- `GET /api/scan/level?path=...` is an alias for the common cached-read path (TBD, per REST taste — see Resolutions §9).
- WebSocket `/ws/scan` continues to stream progress for the currently-running per-folder scan.
- The existing `POST /api/scan` is **removed**. Full-subtree scanning remains available via `DiskScanner.scan()` in core (tests/benchmarks). If a user-facing deep-scan becomes desirable later, a distinct `POST /api/scan/deep` will be added at that time.

### Frontend — tree
- On scan start, the tree renders only the root + its direct children.
- Expanding a folder node fires `POST /api/scan/level` for that folder's path if not already cached; a spinner is shown on the expanding node until the response arrives.
- Percentages on tree rows are computed relative to the sum of known sibling sizes at that level; unknown (not-yet-scanned) folder sizes render as "—" or "?".
- Previously-expanded nodes persist their children across tree collapses (collapse hides UI, does not evict data) until the user rescans or navigates away.

### Frontend — middle column
- Focusing a folder (click in tree, click in middle column, click in 3D) triggers `scan_level` if its children are unknown; during the fetch, the middle column shows a shimmer/skeleton; on success, rows render.
- Sort / group / percentage semantics remain intact; percentages are relative to the now-known direct children of the focused folder.

### Frontend — 3D graph
- On scan start, only the root + direct children are rendered as spheres (edges connect root to each child).
- Clicking a folder sphere triggers `scan_level` and, on success, adds the new children (spheres + edges) into the force graph without re-mounting; the camera stays put, the force simulation gently accommodates the new nodes.
- An already-expanded folder sphere shows a subtle visual cue (e.g., an outer ring) distinguishing it from unexpanded ones.

### Tests
- Unit: `scan_level` on a 3-level fixture returns only level-1 children; symlinks marked and not followed; permission errors produce `accessible=false` nodes, not exceptions; exclusions from M12 apply at every level.
- Unit: cache put/get/invalidate round-trips; invalidate-recursive removes descendants.
- Integration: `POST /api/scan/level` happy path, cache hit, cache miss, invalid path, permission-denied root.
- Frontend: tree expansion triggers exactly one `scan_level` call per folder; second expansion uses cached data (no network call); rescan invalidates and refetches.
- Backward-compat regression (if `POST /api/scan` kept): existing full-scan tests still pass.
- Coverage on `backend/core/` stays ≥ 85 %.

## Resolutions

All open questions from the pre-planning conversation were resolved on 2026-04-19 before `/plan`. Recorded here as a decision log for the spec.

1. **Flavor — pure lazy vs. lazy-first + background refine?** → **(a) Pure lazy.** Folder child sizes are unknown (`None`) until that folder is itself `scan_level`'d. Top-level totals are lower bounds. Fastest first paint, simplest cache model, no background refine channel needed. The UI must clearly render "not yet scanned" folders.

2. **Fate of `POST /api/scan`?** → **Removed.** The endpoint is deleted rather than aliased to `scan_level(root)`. Reasoning: the frontend is being rewritten in the same commit series, so back-compat buys nothing and a surviving full-scan endpoint re-introduces the exact latency pain M14 is fixing. `DiskScanner.scan()` stays in core for tests/benchmarks. If a user-facing "deep-scan this folder" surfaces later, it becomes `POST /api/scan/deep` at that time (YAGNI).

3. **Percentage semantics when siblings are partially unknown?** → **"—" with tooltip "not yet scanned".** Simpler and less misleading than a "≥ X %" lower bound. Bar visualizations collapse to zero width for unknown siblings.

4. **Cache staleness TTL?** → **Never expire automatically.** Invalidation happens only on user rescan (whole-root or per-folder).

5. **Rescan granularity from the UI?** → **Both.** Whole-root rescan keeps its existing top-menu button; per-folder rescan is a right-click menu action on tree nodes (invalidates that folder's partial + descendants).

6. **CLAUDE.md §2.4 update?** → In scope for the M14 commit series. The "Complete scan (not lazy/progressive)" line is rewritten to describe the pure-lazy model. Doc-only, but must land alongside the code or the project instructions contradict the behaviour.

7. **Interaction with exclusions (M12)?** → **No special handling.** Exclusion globs from the settings panel apply per level-scan identically to how they applied per full-scan. Tests cover this.

8. **Interaction with admin elevation (M12)?** → **No special handling.** Elevation is a process-level state; a per-level scan inherits it. Folders that return 403 in non-admin return data in admin, at every level, automatically.

9. **`GET /api/scan/level` alias?** → **Defer.** Ship `POST /api/scan/level` only. Add a GET alias only if a read-only UX need emerges (e.g., shareable deep-links); not a blocker for M14.

## Dependencies
- M12 (admin + settings + exclusions) is already shipped and this spec assumes it.
- M13 (UX refinements) is independent and can ship before or after M14; no ordering constraint.
