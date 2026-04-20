# Tasks: M14 — Lazy (On-Demand) Scanning

Spec: `specs/m14-lazy-scanning/spec.md`
Plan: `specs/m14-lazy-scanning/plan.md`

Each phase is a self-contained commit with its own red → green → refactor cycle. Run the full backend + frontend test suite at the end of every phase; each phase lands on `main` only when typecheck + lint + tests are green.

Baseline before Phase A: `d0343b4` (M13 closeout). Regression targets: backend pytest 111 pass / 4 skipped, vitest 238/238, mypy + tsc clean.

---

## Phase A — New Pydantic models (additive)

**Scope:** Introduce the `LevelScan*` models. Do not remove or change anything yet — existing `ScanResult`/`ScanSummary`/`Ws*Message` stay. This is pure additive.

### Red
- [ ] `tests/unit/test_models.py::test_level_scan_node_folder_size_nullable` — `LevelScanNode(node_type=folder, size=None)` validates.
- [ ] `tests/unit/test_models.py::test_level_scan_node_file_size_required` — file with `size=None` rejects? (Decision: keep permissive — None means "unknown for any reason". Single test: files from `scan_level` always have a numeric size.)
- [ ] `tests/unit/test_models.py::test_level_scan_result_roundtrip` — construct, `model_dump_json()`, `model_validate_json()` → equal.
- [ ] `tests/unit/test_models.py::test_level_scan_request_defaults` — options defaults to `ScanOptions()`, `force_rescan` defaults to False.
- [ ] `tests/unit/test_models.py::test_level_invalidate_request_recursive_default_true`.

### Green
- [ ] Add `LevelScanNode`, `LevelScanResult`, `LevelScanRequest`, `LevelInvalidateRequest` to `backend/core/models.py`.

### Refactor
- [ ] Tighten docstrings on new models.

### Ship
- [ ] `pytest`, `ruff check`, `mypy backend/core` clean.
- [ ] Commit: `feat(m14): add LevelScan* pydantic models`.

---

## Phase B — `DiskScanner.scan_level`

**Scope:** Add the per-level walker. Keep `scan()` unchanged.

### Red
- [ ] `test_scan_level_returns_only_direct_children` on a 3-level fixture: only level-1 children; no grandchildren.
- [ ] `test_scan_level_folder_children_have_null_size`.
- [ ] `test_scan_level_file_children_have_real_size`.
- [ ] `test_scan_level_symlink_child_is_stub_not_followed` (skip on non-Windows where symlink creation requires privs; or use `os.symlink` with fallback).
- [ ] `test_scan_level_permission_denied_on_target_returns_accessible_false` — scan a dir whose `os.scandir` raises `PermissionError`; result has `accessible=False, children=[], error_count=0`.
- [ ] `test_scan_level_permission_denied_on_child_file_marks_child_inaccessible` — result has `accessible=True`, the bad child has `accessible=False`, `error_count=1`.
- [ ] `test_scan_level_applies_exclude_globs` — `options.exclude=["**/node_modules/**"]` filters.
- [ ] `test_scan_level_honors_include_hidden` + `test_scan_level_honors_include_system`.
- [ ] `test_scan_level_on_file_path_raises` — scanning a file (not a dir) raises `NotADirectoryError` (caught by API as 422).
- [ ] `test_scan_level_direct_bytes_known_excludes_folders` — sum over file-children only.
- [ ] `test_scan_level_direct_files_and_folders_counts`.
- [ ] `test_scan_level_options_hash_deterministic` — same options → same hash; different options → different hash.

### Green
- [ ] Implement `DiskScanner.scan_level(path, options) -> LevelScanResult`.
- [ ] Implement `_compute_options_hash(options)` helper (SHA-256 of sorted-keys JSON, first 16 hex chars).

### Refactor
- [ ] Extract shared child-entry filtering (exclusion, hidden, system) into a private helper — reused by `_walk_dir` and `scan_level`.
- [ ] Verify `scan()` still passes its original tests unchanged.

### Ship
- [ ] Backend tests green, coverage on `backend/core/scanner.py` ≥ 85 %.
- [ ] Commit: `feat(m14): DiskScanner.scan_level()`.

---

## Phase C — Cache: per-folder schema

**Scope:** Replace the `scans` table with `scan_levels`; drop legacy on init.

### Red
- [ ] `test_cache_init_drops_legacy_scans_table` — seed DB with old `scans` schema + one row, init ScanCache, assert table is gone and new `scan_levels` table exists.
- [ ] `test_cache_put_get_level_roundtrip`.
- [ ] `test_cache_get_level_missing_returns_none`.
- [ ] `test_cache_get_level_options_hash_is_part_of_key` — same root+folder, different options_hash → different row.
- [ ] `test_cache_invalidate_level_recursive_removes_descendants`.
- [ ] `test_cache_invalidate_level_non_recursive_keeps_descendants`.
- [ ] `test_cache_list_roots_returns_only_root_level_rows` — entries where `folder_path == root_path`.
- [ ] `test_cache_clear_wipes_everything`.

### Green
- [ ] Rewrite `backend/core/cache.py`: new DDL, `put_level`, `get_level`, `invalidate_level`, updated `list_roots`, keep `clear`. Remove `get`, `put`, `delete` methods.

### Refactor
- [ ] `_init_db` logs "Dropped legacy scans table" at INFO if it existed.
- [ ] Private helper `_posix(path)` for key normalization.

### Ship
- [ ] Backend tests green; coverage on `backend/core/cache.py` ≥ 85 %.
- [ ] Commit: `feat(m14): per-folder ScanCache schema with legacy drop`.

---

## Phase D — API: `/api/scan/level` endpoints; remove `/ws/scan`

**Scope:** Wire the new HTTP routes, delete WebSocket plumbing and legacy routes.

### Red (integration)
- [ ] `test_post_scan_level_happy_path` — fresh fixture root, 200, body matches `LevelScanResult`.
- [ ] `test_post_scan_level_uses_cache_on_repeat` — two identical calls; second's `scanned_at` equals the first's.
- [ ] `test_post_scan_level_force_rescan_bypasses_cache` — second call with `force_rescan=true` gets a newer `scanned_at`.
- [ ] `test_post_scan_level_invalid_path_returns_422`.
- [ ] `test_post_scan_level_on_file_path_returns_422`.
- [ ] `test_post_scan_level_permission_denied_returns_200_accessible_false`.
- [ ] `test_delete_scan_level_recursive_removes_descendants` — POST levels A, A/B, A/B/C → DELETE A recursive → POST A/B without force_rescan performs fresh scan.
- [ ] `test_delete_scan_level_non_recursive_keeps_descendants`.
- [ ] `test_get_scans_only_returns_root_level_summaries`.
- [ ] `test_delete_all_scans_still_wipes` (regression).
- [ ] `test_legacy_ws_scan_is_gone` — opening a WS to `/ws/scan` gets 404 / rejected (negative test; may drop if route simply removed).
- [ ] `test_legacy_get_scan_b64_is_gone` — `GET /api/scan/<b64>` → 404.

### Green
- [ ] Add `POST /api/scan/level` and `DELETE /api/scan/level` handlers in `backend/api/scan.py`.
- [ ] Delete `ws_router`, `ws_scan`, `_stream_scan`, `_ws_send_error`, `_decode_root_b64`, `get_scan`, `delete_scan`.
- [ ] Update `backend/app.py` to stop mounting `ws_router`.
- [ ] Rewrite `ScanSummary` in models; update `list_scans` handler.

### Refactor
- [ ] Drop now-unused `Ws*Message` models.
- [ ] Ensure the scanner runs via `asyncio.to_thread` (or `run_in_executor`) in the endpoint.
- [ ] Update `tests/integration/test_scans_bulk_delete.py` if it hits removed routes.

### Ship
- [ ] Backend tests green; integration coverage untouched for non-M14 endpoints.
- [ ] Commit: `feat(m14): POST/DELETE /api/scan/level; remove /ws/scan and legacy routes`.

---

## Phase E — Frontend: `scanStore` rewrite

**Scope:** Replace full-tree store with per-level levels map. Components still old; they'll be rewired in later phases. Keep their tests green by leaving a thin back-compat adapter (`result` as a derived legacy getter) if needed — but prefer to rewire in this commit if feasible without ballooning scope.

### Red (vitest)
- [ ] `scanStore.openRoot_calls_scanLevel_once_and_stores_level`.
- [ ] `scanStore.ensureLevel_cache_hit_does_not_call_api`.
- [ ] `scanStore.ensureLevel_dedupes_concurrent_calls` — two simultaneous `ensureLevel(p)` → one fetch.
- [ ] `scanStore.ensureLevel_error_populates_errors_map_and_clears_inflight`.
- [ ] `scanStore.invalidateLevel_recursive_removes_path_and_descendants`.
- [ ] `scanStore.invalidateLevel_non_recursive_only_removes_exact`.
- [ ] `scanStore.removeNode_splices_child_from_parent_level`.
- [ ] `scanStore.closeRoot_clears_everything`.

### Green
- [ ] Rewrite `frontend/src/stores/scanStore.ts`.
- [ ] Add `scanLevel`, `invalidateLevel` to `frontend/src/lib/api.ts`.
- [ ] Add `LevelScanNode`, `LevelScanResult` to `frontend/src/lib/types.ts`; update `ScanSummary`.
- [ ] Remove `connectScanWs`, `deleteScan`, `encodeRootB64`, `WsMessage`.

### Refactor
- [ ] Key normalization helper `toPosixKey(path)` — reused by store and components.

### Ship
- [ ] `vitest run`, `tsc --noEmit`, `eslint` all green.
- [ ] Commit: `feat(m14): scanStore levels map + ensureLevel/invalidateLevel`.

---

## Phase F — Frontend: tree column lazy expansion

### Red
- [ ] `tree.expand_triggers_ensureLevel_once` — mock scanLevel; expand a folder; assert one call.
- [ ] `tree.re_expand_uses_cache_no_call`.
- [ ] `tree.spinner_visible_while_inflight`.
- [ ] `tree.unknown_folder_size_renders_em_dash_and_title`.
- [ ] `tree.known_folder_size_renders_pretty_bytes`.
- [ ] `tree.right_click_rescan_this_folder_calls_invalidate_then_ensure`.

### Green
- [ ] Rewrite `FolderTreePanel.tsx` + tree row component to source children from `levels`, show spinner, "—" for null size.
- [ ] Add right-click "Rescan this folder" action (hook into existing context menu infrastructure).

### Refactor
- [ ] Extract "not yet scanned" bar renderer as shared component.

### Ship
- [ ] Frontend tests green; visual smoke via manual verify.
- [ ] Commit: `feat(m14): tree column lazy expansion + per-folder rescan`.

---

## Phase G — Frontend: middle column + insights rewired

### Red
- [ ] `contents.selectedPath_change_calls_ensureLevel_once`.
- [ ] `contents.shimmer_while_inflight_rows_on_success`.
- [ ] `contents.percentages_use_directBytesKnown_denominator`.
- [ ] `contents.unknown_folder_size_row_shows_em_dash`.
- [ ] `insights.pie_chart_sources_from_levels_selectedPath`.
- [ ] `insights.top_n_sources_direct_children_only`.
- [ ] `insights.summary_reports_direct_counts`.

### Green
- [ ] Rewrite `ContentsPanel.tsx` and the contents table row to read `levels[selectedPath]`.
- [ ] Rewrite `InsightsPanel.tsx` and its subcomponents to source from the focused level only.
- [ ] Drop "deepest path" stat.

### Refactor
- [ ] Extract `useFocusedLevel()` hook.

### Ship
- [ ] Frontend tests green.
- [ ] Commit: `feat(m14): contents + insights rewired to focused level`.

---

## Phase H — Frontend: 3D graph incremental expansion

### Red
- [x] `graph3d.initial_mount_renders_root_plus_direct_children`.
- [x] `graph3d.click_folder_sphere_calls_ensureLevel_and_appends_children`.
- [x] `graph3d.already_expanded_sphere_does_not_refetch`.
- [x] `graph3d.expanded_sphere_has_outer_ring_indicator`.

### Green
- [x] Rewrite `graphData.ts` to derive nodes/edges from the `levels` map via BFS over expanded paths.
- [x] Wire click handler to `ensureLevel`; append data without re-mounting ForceGraph3D.

### Refactor
- [x] Keep force-simulation alpha low on append to avoid visual jitter.

### Ship
- [x] Frontend tests green; manual verify camera stability.
- [x] Commit: `feat(m14): 3D graph incremental expansion` (5a0fe91).

---

## Phase I — Rescan flows + TopMenuBar rewire

### Red
- [ ] `topMenuBar.rescan_invalidates_root_recursive_then_ensures`.
- [ ] `topMenuBar.rescan_preserves_selectedPath_and_refetches_selected_level`.

### Green
- [ ] Update `TopMenuBar.tsx` rescan button handler.

### Refactor
- [ ] Consolidate rescan logic into a `scanStore.rescanRoot()` action.

### Ship
- [ ] Frontend tests green.
- [ ] Commit: `feat(m14): top-bar rescan rewired for lazy model`.

---

## Phase J — Docs: CLAUDE.md rewrite

### Green
- [ ] Rewrite `CLAUDE.md` §2.4 — replace the "Complete scan (not lazy/progressive)" bullet with the lazy model description.
- [ ] Update §2.2 right column — insights are "direct children of the focused folder" only.
- [ ] Update §6.6 — "level scans never recurse past direct children" addendum.
- [ ] Remove M14 from §10 "upcoming milestones" list (if still present) and mark shipped.
- [ ] Remove the "open question" mention from §11 if present.

### Ship
- [ ] Commit: `docs(m14): rewrite CLAUDE.md for lazy scanning model`.

---

## Phase K — i18n (EN/ES)

### Red
- [ ] Each new key has both EN and ES values; i18n-key-regex test passes.

### Green
- [ ] Add to `frontend/src/i18n/en.json` and `es.json`:
  - `tree.notYetScanned` — "Not yet scanned" / "Aún no escaneado".
  - `tree.rescanThisFolder` — "Rescan this folder" / "Volver a escanear esta carpeta".
  - `tree.scanningFolder` — "Scanning…" / "Escaneando…".
  - `insights.insightsFor` — "Insights for {{name}}" / "Detalles de {{name}}".
  - `insights.directChildrenOnly` — "Direct children only" / "Solo descendientes directos".

### Ship
- [ ] Tests green.
- [ ] Commit: `chore(m14): i18n strings for lazy scanning UI`.

---

## Phase L — Finalization

### Ship
- [ ] Full regression: `pytest`, `vitest`, `mypy backend/core`, `tsc --noEmit`, `ruff check` — all clean.
- [ ] Coverage report on `backend/core/` ≥ 85 %.
- [ ] Manual verify per `plan.md#manual-verification`.
- [ ] Update `.claude/memory/current.md` to reflect M14 shipped.
- [ ] Add lessons to `.claude/memory/lessons/` for any gotcha discovered (e.g., options-hash stability, ForceGraph3D append pattern).
- [ ] Archive `current.md` to `.claude/memory/archive/YYYY-MM-DD-m14-shipped.md`.
- [ ] Commit: `docs(m14): M14 closeout — memory refresh`.
- [ ] Push range to `origin/main`.
