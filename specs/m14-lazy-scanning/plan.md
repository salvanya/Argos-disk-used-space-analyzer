# Plan: M14 — Lazy (On-Demand) Scanning

Spec: `specs/m14-lazy-scanning/spec.md` (Resolutions §1–9 applied 2026-04-19).
Direction decision: `.claude/memory/decisions/0005-lazy-scanning-over-full-scan.md`.

## Architecture Overview

Pure-lazy, single-level scans. Every user-initiated "scan" call covers exactly one folder's direct children; folder children are returned as stubs with `size=None` until they are themselves scanned. The SQLite cache stores one row per `(root, folder, options_hash)`. A single synchronous HTTP call (`POST /api/scan/level`) replaces the WebSocket streaming protocol — a single-level walk is fast enough that progress ticks are unnecessary. The frontend store holds a `levels` map keyed by folder path; tree / middle / 3D all read from that map and trigger `ensureLevel(path)` on expand / focus / click.

## Files Affected

### Backend — core
- `backend/core/models.py`
  - **Add** `LevelScanNode` (like `ScanNode` but `size: int | None`, no `children`).
  - **Add** `LevelScanResult` (root_path, folder_path, scanned_at, duration_seconds, accessible, is_link, direct_files, direct_folders, direct_bytes_known, error_count, children, options_hash).
  - **Add** `LevelScanRequest`, `LevelInvalidateRequest`.
  - **Rewrite** `ScanSummary` to reflect root-level shallow counts (`direct_files`, `direct_folders`, `direct_bytes_known`, `error_count`, `duration_seconds`, `scanned_at`, `root_path`). Remove `total_*` fields.
  - **Remove** `WsProgressMessage`, `WsCompleteMessage`, `WsErrorMessage` (no more /ws/scan).
  - Keep `ScanResult`, `ScanNode`, `ScanStartRequest` for now — used by `DiskScanner.scan()` and by unit tests; flagged internal-only.

- `backend/core/scanner.py`
  - **Add** `DiskScanner.scan_level(path, options) -> LevelScanResult`. Implementation: one `os.scandir` pass; for each entry, stat if file → known size; if folder → `size=None`; if symlink → stub, never followed. Permission-denied on the level itself → `LevelScanResult(accessible=False, children=[])`. Permission-denied on a child file → accessible=False on that child.
  - **Add** `_compute_options_hash(options: ScanOptions) -> str` helper (SHA-256 of sorted-keys JSON dump; first 16 hex chars).
  - Keep existing `scan()` and private helpers; they become core-only (no API wiring).

- `backend/core/cache.py`
  - **New schema**: `scan_levels(id, root_path, folder_path, options_hash, scanned_at, result_json)` with unique index on `(root_path, folder_path, options_hash)` and a non-unique index on `root_path` for descendant invalidation.
  - **Add** `get_level(root, folder, options_hash)`, `put_level(result: LevelScanResult)`, `invalidate_level(root, folder, *, recursive: bool)`.
  - **Rewrite** `list_roots()` to return only entries where `folder_path == root_path` (i.e. the level for the user-picked root).
  - **Keep** `clear()` (drops all rows).
  - **Migration**: on `_init_db`, `DROP TABLE IF EXISTS scans` after creating the new table. Log an INFO line. Acceptable data loss — the cache is a perf aid, not user data.
  - **Remove** `get(root_path) -> ScanResult | None`, `put(result: ScanResult)`, `delete(root_path)` — legacy full-scan API, callers will be rewritten.

### Backend — API
- `backend/api/scan.py`
  - **Remove** `ws_router`, `ws_scan`, `_stream_scan`, `_ws_send_error` — the WebSocket surface goes entirely.
  - **Remove** `GET /scan/{root_b64}`, `DELETE /scan/{root_b64}`, `_decode_root_b64` (not needed once paths are in request bodies).
  - **Add** `POST /api/scan/level` (body: `LevelScanRequest`, response: `LevelScanResult`). Cache-hit unless `force_rescan=true`. Runs scanner in an executor (blocking syscall) via `asyncio.to_thread`.
  - **Add** `DELETE /api/scan/level` (body: `LevelInvalidateRequest`, response: 204). `recursive=true` default.
  - **Keep** `GET /api/scans` (now returns new `ScanSummary`s built from root-level rows only).
  - **Keep** `DELETE /api/scans`.

- `backend/app.py`
  - **Remove** `ws_router` mount (no more WebSocket routes — `/ws/scan` was the only one).

### Frontend — lib / stores
- `frontend/src/lib/types.ts`
  - **Add** `LevelScanNode`, `LevelScanResult` (camelCase, derived from backend).
  - **Rewrite** `ScanSummary` to match the new backend shape.
  - **Remove** `WsMessage`, `ScanResult` (keep `ScanNode` only if still referenced by tests we can't yet delete).

- `frontend/src/lib/api.ts`
  - **Add** `scanLevel(rootPath, folderPath, options?, forceRescan?)`.
  - **Add** `invalidateLevel(rootPath, folderPath, recursive: boolean)`.
  - **Remove** `connectScanWs`, `deleteScan` (per-root), `encodeRootB64`.
  - **Update** `listScans` return type to the new `ScanSummary`.
  - **Keep** `deleteAllScans`.

- `frontend/src/stores/scanStore.ts`
  - **Rewrite**. New shape:
    ```ts
    interface ScanState {
      root: string | null;
      selectedPath: string;
      levels: Record<string, LevelScanResult>;
      inflight: Set<string>;
      errors: Record<string, string>;
      openRoot(path: string): Promise<void>;
      ensureLevel(path: string): Promise<void>;
      invalidateLevel(path: string, recursive: boolean): Promise<void>;
      closeRoot(): void;
      removeNode(path: string): void;  // updates the parent level's children array
      setSelectedPath(path: string): void;
    }
    ```
  - `ensureLevel` de-dupes concurrent calls via `inflight`. `invalidateLevel` removes all `levels[p]` where `p === path` or `p` starts with `path + "/"` (when recursive).
  - `removeNode` finds the parent-level by trimming the last path segment and splices the child out.

- `frontend/src/stores/explorerStore.ts`
  - Update if it holds any derived full-tree view state.

### Frontend — components
- `frontend/src/components/explorer/columns/tree/*`
  - Render tree from the `levels` map. A node's `children` are `levels[node.path]?.children ?? []`.
  - Expansion triggers `ensureLevel(node.path)`; spinner while `inflight.has(node.path)`.
  - Unknown folder `size` → `"—"` with `title="Not yet scanned"`; 0-width bar.
  - Right-click menu gains "Rescan this folder" → `invalidateLevel(path, recursive=true)` then `ensureLevel(path)`.

- `frontend/src/components/explorer/columns/contents/*`
  - When `selectedPath` changes, call `ensureLevel(selectedPath)`; shimmer skeleton while inflight.
  - Rows source: `levels[selectedPath]?.children ?? []`.
  - Percentages: denominator = `levels[selectedPath].directBytesKnown`; folder children with `size===null` contribute 0 and show "—".

- `frontend/src/components/explorer/columns/insights/*`
  - Pie / top-N / summary computed from direct children of `levels[selectedPath]` only. Copy shifts to "Insights for <folderName>" not "Insights for scan".
  - "Largest file" and "deepest path" become "largest direct child" and drop, respectively (deepest path is a full-tree concept).

- `frontend/src/components/explorer/graph3d/Graph3DView.tsx` + `graphData.ts`
  - Build nodes/edges from the `levels` map. Start with root + root-level children.
  - Clicking a folder sphere → `ensureLevel(path)` → append new nodes/edges to the graph data in place (without re-mounting ForceGraph3D).
  - Expanded-folder spheres get a subtle outer ring.

- `frontend/src/components/explorer/TopMenuBar.tsx`
  - Rescan button now calls `invalidateLevel(root, recursive=true)` then `ensureLevel(root)` (and triggers `ensureLevel` for any previously-open selectedPath).

- `frontend/src/pages/Explorer.tsx` (or wherever root mount happens)
  - On mount: `openRoot(rootPath)` which sets `root` and calls `ensureLevel(rootPath)`.

- `frontend/src/i18n/en.json` + `es.json`
  - New keys: `tree.notYetScanned`, `tree.rescanThisFolder`, `tree.scanningFolder`, `insights.insightsFor`, etc.

### Tests
- `tests/unit/test_scanner.py` — add `scan_level` cases; keep existing `scan` cases untouched.
- `tests/unit/test_cache.py` — rewrite for level API; keep a small migration test (legacy `scans` table drop).
- `tests/integration/test_api_scan.py` — rewrite for POST/DELETE `/api/scan/level`. Remove WS tests.
- `tests/integration/test_scans_bulk_delete.py` — update if it hits the removed endpoints; likely still works against `DELETE /api/scans`.
- Frontend:
  - `frontend/src/stores/__tests__/scanStore.test.ts` — new suite: openRoot, ensureLevel (fresh / cached / inflight-dedup), invalidateLevel (recursive, non-recursive), removeNode.
  - `frontend/src/components/explorer/columns/__tests__/*` — update tree/contents tests for lazy expansion.
  - `frontend/src/components/explorer/graph3d/__tests__/*` — update graph tests for incremental node addition.

### Docs
- `CLAUDE.md` §2.4 — rewrite the "Complete scan (not lazy/progressive)" bullet. New wording: lazy per-level scan; root shows direct children instantly; expanding fetches that folder's level; "—" for not-yet-scanned folder sizes; rescan-whole-root and rescan-per-folder supported.
- `CLAUDE.md` §2.2 right column — insights are "direct children of the focused folder" rather than "global across the scan".
- `CLAUDE.md` §6.6 — filesystem-scanning rules: keep symlink/permission/hidden rules unchanged; add "level scans never recurse past direct children".
- `specs/m14-lazy-scanning/tasks.md` — produced separately when you approve this plan.

## Data Model Changes

### Pydantic (new / changed)

```python
class LevelScanNode(BaseModel):
    name: str
    path: str                     # absolute, posix
    node_type: NodeType
    size: int | None              # None = unknown (folders not yet expanded)
    accessible: bool
    is_link: bool
    link_target: str | None = None

class LevelScanResult(BaseModel):
    root_path: str                # user-picked root
    folder_path: str              # this level's folder
    scanned_at: datetime
    duration_seconds: float
    accessible: bool              # False if this folder itself was 403
    is_link: bool                 # typically False; true = degenerate case
    direct_files: int
    direct_folders: int
    direct_bytes_known: int       # sum of file-child sizes (folders contribute 0)
    error_count: int              # children with accessible=False at this level
    children: list[LevelScanNode]
    options_hash: str             # echoed for clients that want to key their cache

class LevelScanRequest(BaseModel):
    root: str
    path: str
    options: ScanOptions = ScanOptions()
    force_rescan: bool = False

class LevelInvalidateRequest(BaseModel):
    root: str
    path: str
    recursive: bool = True

class ScanSummary(BaseModel):     # rewrite
    root_path: str
    scanned_at: datetime
    direct_files: int
    direct_folders: int
    direct_bytes_known: int
    error_count: int
    duration_seconds: float
```

### SQLite DDL

```sql
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

DROP TABLE IF EXISTS scans;   -- migrate out the M2 full-tree cache
```

### TypeScript

```ts
export interface LevelScanNode {
  name: string;
  path: string;
  nodeType: "file" | "folder" | "symlink";
  size: number | null;
  accessible: boolean;
  isLink: boolean;
  linkTarget: string | null;
}
export interface LevelScanResult {
  rootPath: string;
  folderPath: string;
  scannedAt: string;
  durationSeconds: number;
  accessible: boolean;
  isLink: boolean;
  directFiles: number;
  directFolders: number;
  directBytesKnown: number;
  errorCount: number;
  children: LevelScanNode[];
  optionsHash: string;
}
```

## API Surface

**Added**
- `POST /api/scan/level` → `LevelScanResult`. Body: `{ root, path, options?, force_rescan? }`. Cache hit returns immediately; cache miss scans in an executor and caches.
- `DELETE /api/scan/level` → 204. Body: `{ root, path, recursive }`. `recursive=true` nukes the row plus descendants (`WHERE root_path=? AND folder_path=? OR folder_path LIKE ?||'/%'`).

**Removed**
- WebSocket `/ws/scan` (and entire `ws_router`).
- `GET /scan/{root_b64}`.
- `DELETE /scan/{root_b64}`.

**Kept**
- `GET /api/scans` — list root-level summaries only.
- `DELETE /api/scans` — wipe all.

## Testing Strategy

TDD throughout: red → green → refactor. Target: backend/core coverage ≥85 %, every frontend store action covered.

### Backend unit
- `scan_level` on fixture tree returns only direct children.
- Folder children have `size=None`; files have real sizes; symlinks are stubs.
- Permission-denied on the level itself → `accessible=False, children=[]`, no exception.
- Permission-denied on a child file → that child has `accessible=False`, others unaffected.
- Exclusions and hidden/system filters apply at this level.
- Scanning a file path (not a dir) → raises a specific error caught by the API as 422.
- Cache: `put_level`/`get_level` round-trip; `get_level` returns `None` for unknown options_hash; `invalidate_level(recursive=True)` removes descendants; `invalidate_level(recursive=False)` keeps them; legacy `scans` table is dropped on init.

### Backend integration
- `POST /api/scan/level` happy path (fresh scan + cache write).
- `POST /api/scan/level` second call returns cached result (verified via scanned_at unchanged across calls).
- `POST /api/scan/level` with `force_rescan=true` produces a new scanned_at.
- `POST /api/scan/level` on nonexistent path → 422.
- `POST /api/scan/level` on permission-denied folder → 200 with `accessible=false`.
- `DELETE /api/scan/level` recursive removes descendants (follow-up `POST` without force_rescan re-scans).
- `GET /api/scans` shows only root-level entries.

### Frontend unit
- `scanStore.openRoot` sets `root`, calls scanLevel once, populates `levels[root]`.
- `scanStore.ensureLevel`: cache-hit → no API call; inflight-dedup → only one call for parallel invocations; network-error → `errors[path]` populated, `inflight` cleared.
- `scanStore.invalidateLevel(p, recursive=true)` removes every `levels[k]` where `k===p || k.startsWith(p + "/")`.
- `scanStore.removeNode(p)` mutates the parent level's children array.
- Tree component: expanding a folder triggers exactly one `scanLevel` call; second expansion uses cached data.
- Contents: shimmer renders during inflight; rows render on success; percentages computed against `directBytesKnown`.
- Graph3D: initial mount shows root + direct children; clicking a sphere adds its children without re-mounting; expanded-state indicator visible.

### Manual verification (end of M14)
- Pick `C:\` from Home → first paint < 2 s.
- Expand `C:\Windows` → spinner, then direct children visible in tree/middle/3D.
- Right-click a folder → "Rescan this folder" → spinner, fresh data.
- Top-bar "Rescan" → root-level invalidation + refetch; subtree nodes stay stable (their levels remain cached) until they're themselves rescanned.
- Close + reopen app → root level served from cache instantly.
- Toggle include-hidden → cache key changes (different `options_hash`), fresh scan runs; toggling back → the original partial is served from cache.

## Risks & Mitigations

1. **Insights panel semantics shift (global → level-only)** may confuse users.
   - Mitigation: copy change ("Insights for <folder>"), drop "deepest path" stat, tooltip on stats clarifying "direct children only".

2. **Percentage denominator skew** when some siblings have `size=null`.
   - Mitigation: denominator = `directBytesKnown` (files only) + sum of folder children with a known size. Folder children without a known size contribute 0 to the denominator *and* render "—" + 0-width bar. Document in UI copy. When/if all folder children are drilled, the denominator equals the folder's true size.

3. **Cache schema break with M12 DB files.**
   - Mitigation: one-time `DROP TABLE IF EXISTS scans` on init. Cache is ephemeral. Log an INFO line for observability.

4. **Frontend state refactor is wide — regressions in tree / contents / insights / 3D / delete flow.**
   - Mitigation: write TDD tests for each store action before touching components; rewire one column at a time; keep existing visual/interaction assertions (sort, group-by, right-click delete, 3D click-to-focus) green throughout.

5. **Removing `/ws/scan` leaves stale WS plumbing in tests and helpers.**
   - Mitigation: delete at source (ws_router, _stream_scan, Ws\*Message models, frontend connectScanWs), not commented-out. Update `backend/api/dependencies.py` / `app.py` mounts.

6. **Path key normalization (Windows backslashes vs posix).**
   - Mitigation: all cache keys and `levels` map keys use `Path.as_posix()`. Existing lesson applies — reuse it.

7. **Options-hash churn on UI toggles** (e.g. include-hidden flips) creates many cache entries.
   - Mitigation: accepted cost. Cache entries are small (JSON blobs, one per folder). `DELETE /api/scans` remains available from Settings.

8. **Concurrent `ensureLevel` calls** during rapid expand / focus changes could race.
   - Mitigation: `inflight` set in scanStore; second call short-circuits into an `await`-on-existing-promise pattern.

9. **3D graph re-layout when adding children** can jump/destabilize visually.
   - Mitigation: append nodes/edges to the existing ForceGraph3D data without re-mounting; lower simulation alpha on add; keep camera position.

10. **Insights "largest file" / "deepest path" stats degrade in usefulness** when limited to one level.
    - Mitigation: drop "deepest path" (full-tree concept). "Largest direct child" remains meaningful.

## Rollback Plan

- Baseline tag already exists at `d0343b4` (M13 closeout).
- If M14 needs to be reverted mid-flight: `git revert` the M14 commit range on main. On next launch, the legacy `scans` table is gone (dropped during M14 init), so users re-trigger a scan and the old-style full-scan populates a fresh DB. No user-facing data is lost (cache only).
- If only the frontend is broken: freeze frontend on the pre-M14 tree but already-shipped backend lazy endpoints stay — not a safe state; prefer a full revert.

## Commit Plan (high-level, for later tasks.md)

1. `refactor(m14): add LevelScanResult models, keep old models in place` (no behavior change; tests still green).
2. `feat(m14): DiskScanner.scan_level()` with unit tests.
3. `feat(m14): ScanCache per-folder schema + migration` with unit tests.
4. `feat(m14): POST/DELETE /api/scan/level endpoints; remove ws/scan + legacy routes` with integration tests.
5. `feat(m14): scanStore levels map + ensureLevel/invalidateLevel`.
6. `feat(m14): tree column lazy expansion`.
7. `feat(m14): contents + insights rewired to focused level`.
8. `feat(m14): 3D graph incremental expansion`.
9. `feat(m14): per-folder rescan right-click + top-bar rescan rewired`.
10. `docs(m14): CLAUDE.md §2.2/§2.4/§6.6 rewritten for lazy model`.
11. `chore(m14): i18n keys EN/ES for not-yet-scanned, partial, rescan-folder`.
12. `chore(m14): tasks.md checked off + current.md updated`.
