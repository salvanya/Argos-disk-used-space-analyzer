# Spec: M14 — Lazy (On-Demand) Scanning

## Problem
The current scanner (`backend/core/scanner.DiskScanner.scan`) walks the entire subtree of the chosen root eagerly, returning a complete `ScanResult` only when every file and folder has been stat'd. For large roots like `C:\` (hundreds of GB, millions of inodes), this means:
- First paint is blocked for minutes — unacceptable UX even with the WebSocket progress bar from M2.
- Memory grows proportionally to the entire tree even when the user only cares about the top level.
- A single permission wall or slow symlink-looking node anywhere deep in the tree delays the whole first render.

CLAUDE.md §2.4 mandates "Complete scan (not lazy/progressive)", but that requirement predates real-world testing on large disks — the user has now hit the pain and wants lazy scanning instead. This spec documents that reversal and defines the new scanning model.

## Goals
- The initial scan of a root returns only the **direct children** (files + folders) of that root, each with a known size — for folder children, "known size" requires deciding between a shallow-immediate return (size unknown until drilled into) and a deep-but-deferred return (size computed recursively per child folder before it shows up). See Open Questions.
- Expanding a folder (in the tree on the left, or clicking/focusing it in the middle column, or clicking a sphere in the 3D view) triggers a per-folder scan of its direct children — not a full subtree walk.
- Percentages displayed in the tree, middle column, and insights are computed relative to the currently-known siblings at that level; they update as more levels are scanned.
- The SQLite cache stores per-folder partial results, keyed by absolute path, with an "expanded-at" timestamp so stale partial results can be re-fetched.
- Rescan invalidates the per-folder cache for the target path and (optionally) all its descendants.
- The API gains a new endpoint for per-folder scans; the existing full-scan endpoint is either deprecated, kept as a "scan this subtree fully" opt-in, or replaced entirely — see Open Questions.
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
- A new (or renamed) `DiskScanner.scan_level(path, options) -> LevelScanResult` returns: the path itself, its direct children (files + folders), per-child size (see Open Question 1), flags for symlink / accessible / hidden-or-system, and aggregate stats for this level only (`direct_files`, `direct_folders`, `direct_bytes_known`).
- The scanner never descends below the requested level when `scan_level` is called (except as required by Open Question 1's chosen resolution).
- All existing safety guarantees (symlink detection, permission handling, exclusion globs from M12) are preserved.
- `DiskScanner.scan` (full subtree) remains available and unchanged for use cases that still want a full walk (tests, benchmarks, or an optional "deep-scan this folder" user action).

### Cache
- The `ScanCache` schema adds (or repurposes) a per-folder row keyed by `(root_path, folder_path)` with `children_json`, `scanned_at`, `options_hash`.
- `ScanCache.get_level(folder_path, options)` returns the cached `LevelScanResult` or `None`.
- `ScanCache.put_level(folder_path, options, result)` upserts the row.
- `ScanCache.invalidate_level(folder_path, recursive: bool)` deletes the row and, when recursive, every descendant row.
- `DELETE /api/scans` (introduced in M12) continues to wipe everything.

### API
- `POST /api/scan/level` with body `{ path: string, options: ScanOptions }` returns a `LevelScanResult`. Cached results are returned when fresh; otherwise a fresh scan runs and is cached.
- `GET /api/scan/level?path=...` is an alias for the common cached-read path (TBD, per REST taste — see Open Questions).
- WebSocket `/ws/scan` continues to stream progress for the currently-running per-folder scan.
- The existing `POST /api/scan` is either (a) kept as "full subtree scan" for opt-in, (b) routed internally to `scan_level(root)` for backwards compatibility, or (c) removed. Resolution in Open Questions.

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

## Open Questions (MUST resolve before plan.md / tasks.md)

1. **Flavor — pure lazy vs. lazy-first + background refine?**
   - (a) **Pure lazy:** child folder sizes are unknown until that child is itself expanded. Top-level totals are lower bounds. Fastest first paint, simplest cache model.
   - (b) **Lazy-first + background refine:** first response is fast (known *direct* children + their sizes computed via a shallow recursive walk per child folder — still orders of magnitude cheaper than full-tree), and a background task continues walking deeper to refine the numbers the user already sees. Requires a progressive-update channel (WebSocket) and a UI story for "this number is approximate / still refining".
   - **User must pick before implementation.** The previous conversation left this unresolved.

2. **Fate of `POST /api/scan`:** keep as opt-in full-scan? Route to `scan_level(root)` for back-compat? Remove entirely? Default proposal: **route to `scan_level(root)` for back-compat**, and add a distinct `POST /api/scan/deep` if/when an opt-in full-scan is needed.

3. **Percentage semantics when siblings are partially unknown:** show "—" for unknown, or show "≥ X %" using known-size as a lower bound? Default proposal: **"—" with a tooltip "not yet scanned"** — simpler and less misleading.

4. **Cache staleness TTL:** never expire automatically (only on user rescan), or expire after N minutes to catch external filesystem changes? Default proposal: **never expire**; user triggers rescan.

5. **Rescan granularity from the UI:** rescan-whole-root (current behaviour) only, or also rescan-this-folder (invalidates one partial)? Default proposal: **both**, with the latter as a right-click menu action on tree nodes.

6. **CLAUDE.md §2.4 update:** the "Complete scan (not lazy/progressive)" line must be rewritten to reflect the new model. This is a doc-only task but must land in the same commit series as the code.

7. **Interaction with exclusions (M12):** exclusions apply per-level scan — same semantics, no special handling. Confirm.

8. **Interaction with admin elevation (M12):** per-level scans in an elevated process should read protected folders that were previously 403s; confirm no special handling needed (elevation affects the whole process, not individual scans).

## Dependencies
- M12 (admin + settings + exclusions) is already shipped and this spec assumes it.
- M13 (UX refinements) is independent and can ship before or after M14; no ordering constraint.
