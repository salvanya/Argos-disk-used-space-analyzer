# Plan: M12 — Admin Relaunch + Advanced Settings

## Architecture Overview

M12 splits cleanly into five workstreams. Each is independently testable and revertible; they share only the `ScanOptions` model extension and a handful of i18n keys.

1. **Scanner exclusions** — extend `ScanOptions` with `exclude: list[str]`, thread it through `DiskScanner._walk`, match via `fnmatch` on the forward-slashed absolute path. Invalid globs rejected at the Pydantic boundary.
2. **Cache bulk-clear** — add `ScanCache.clear()` + `DELETE /api/scans` endpoint (204, idempotent). Per-root `DELETE /api/scan/{root_b64}` already exists; reuse it.
3. **Admin relaunch** — new `POST /api/system/relaunch-admin` that invokes `ShellExecuteW(None, "runas", sys.executable, argv_string, None, 1)`, then schedules a graceful server shutdown via `uvicorn.Server.should_exit` (or `os.kill(pid, SIGTERM)`-equivalent on Windows: `signal.CTRL_BREAK_EVENT`/process exit) after a 500 ms delay. Guards: 409 already-elevated, 501 non-Windows, 403 if `ShellExecuteW` returns a UAC-declined code (`SE_ERR_ACCESSDENIED` / return value ≤ 32).
4. **Frontend — admin badge + relaunch button** — Explorer header renders `AdminBadge` pill + "Relaunch as administrator" button (Windows + non-elevated only) with a confirmation dialog.
5. **Frontend — Settings drawer** — right-side drawer (480 px) opened by a gear button to the right of the locale toggle in `TopMenuBar`. Three sections: Scan Options (include hidden / include system), Exclusions (list + add/remove), Cache (list from `/api/scans`, delete one, clear all). Persists scan options + exclusions to `localStorage`; wired into `startScan`.

Plus two docs/cleanup touches: drop the `follow_symlinks` bullet from CLAUDE.md §2.2 and remove the now-redundant "Follow symlinks" toggle from `TopMenuBar` + `explorerStore` (dead toggle; scanner never followed symlinks anyway).

## Files Affected

### Create

**Backend**
- `backend/api/system.py` — _modify_, but see below for one new endpoint and helper. (No new file.)

**Frontend components**
- `frontend/src/components/explorer/AdminBadge.tsx` — pill with shield / user icon + translated label.
- `frontend/src/components/explorer/RelaunchAdminButton.tsx` — button + confirmation dialog; handles UAC-declined toast.
- `frontend/src/components/explorer/settings/SettingsDrawer.tsx` — right-side drawer shell; `AnimatePresence`; `useReducedMotion`-aware; Escape-to-close; focus trap.
- `frontend/src/components/explorer/settings/ScanOptionsSection.tsx` — toggles for hidden + system.
- `frontend/src/components/explorer/settings/ExclusionsSection.tsx` — list + add/remove.
- `frontend/src/components/explorer/settings/CacheSection.tsx` — cached-scans list + delete-one + clear-all.
- `frontend/src/components/ui/ConfirmDialog.tsx` — reusable (used by relaunch + clear-all).
- `frontend/src/stores/settingsStore.ts` — zustand slice for `include_hidden`, `include_system`, `exclude[]`; hydrated from `localStorage`; persisted on change.
- `frontend/src/lib/admin.ts` — typed wrapper for `POST /api/system/relaunch-admin`.

**Tests**
- `tests/unit/test_scanner_exclusions.py`
- `tests/unit/test_cache_clear.py`
- `tests/integration/test_relaunch_endpoint.py`
- `tests/integration/test_scans_bulk_delete.py`
- `frontend/src/components/explorer/__tests__/AdminBadge.test.tsx`
- `frontend/src/components/explorer/__tests__/RelaunchAdminButton.test.tsx`
- `frontend/src/components/explorer/settings/__tests__/SettingsDrawer.test.tsx`
- `frontend/src/components/explorer/settings/__tests__/ExclusionsSection.test.tsx`
- `frontend/src/components/explorer/settings/__tests__/CacheSection.test.tsx`
- `frontend/src/components/explorer/settings/__tests__/ScanOptionsSection.test.tsx`
- `frontend/src/stores/__tests__/settingsStore.test.ts`
- `frontend/src/components/ui/__tests__/ConfirmDialog.test.tsx`

**Docs**
- `specs/m12-admin-settings/tasks.md` (produced together with plan approval).

### Modify

**Backend**
- `backend/core/models.py` — add `exclude: list[str] = []` on `ScanOptions`; Pydantic `field_validator` that compiles each glob via `fnmatch.translate` to validate.
- `backend/core/scanner.py` — inject exclusion match inside `_walk` before descending into children; normalise entry path to forward slashes; match any glob ⇒ `continue`. Zero-glob branch must be the default hot path (no list allocation per iteration).
- `backend/core/cache.py` — add `clear() -> None` that executes `DELETE FROM scans`.
- `backend/api/system.py` — add `POST /api/system/relaunch-admin`; extract `_relaunch_as_admin()` helper so it can be monkeypatched in tests.
- `backend/api/scan.py` — add `DELETE /api/scans` (bulk clear).
- `backend/core/models.py` — if we expose a richer system info later we add fields; for now the existing `SystemInfo` suffices.

**Frontend**
- `frontend/src/pages/Explorer.tsx` — render `<SettingsDrawer>` (controlled by `explorerStore.settingsOpen`); render `<AdminBadge>` + `<RelaunchAdminButton>` in the header area.
- `frontend/src/components/explorer/TopMenuBar.tsx` —
  - Add a gear button to the right of the locale toggle; toggles `settingsOpen`.
  - **Remove** the `toggleSymlinks` / `followSymlinks` menu button and the now-unused `Link` icon import (resolves Open Question #4).
  - Move `showHidden` / `toggleHidden` ownership out of `explorerStore` — value lives in `settingsStore` now. Keep the toggle in the top bar as a fast-path shortcut that writes through to `settingsStore`. *(Alternative: drop the top-bar hidden toggle and only expose it in Settings. Will check with user in the single Open Question below.)*
- `frontend/src/stores/explorerStore.ts` — remove `followSymlinks` / `toggleSymlinks`. Keep `showHidden` or migrate to `settingsStore` (see alternative above).
- `frontend/src/stores/scanStore.ts` or wherever `startScan` composes the request body — include `settingsStore.getState()` values (`include_hidden`, `include_system`, `exclude`) in the `POST /api/scan` payload (and the `connectScanWs` URL if options flow via query string — will verify during implementation).
- `frontend/src/lib/api.ts` — add `deleteAllScans()` + `relaunchAdmin()`.
- `frontend/src/i18n/en.json` + `es.json` — new keys:
  - `header.admin.elevated` / `header.admin.standard`
  - `header.admin.relaunch` / `header.admin.relaunchConfirm.title` / `header.admin.relaunchConfirm.body` / `header.admin.relaunchConfirm.cta`
  - `settings.title`, `settings.sections.scan`, `settings.sections.exclusions`, `settings.sections.cache`
  - `settings.scan.includeHidden`, `settings.scan.includeSystem`
  - `settings.exclusions.placeholder`, `settings.exclusions.add`, `settings.exclusions.empty`, `settings.exclusions.hint`
  - `settings.cache.empty`, `settings.cache.delete`, `settings.cache.clearAll`, `settings.cache.clearAllConfirm.*`
  - `errors.uacDeclined`, `errors.alreadyElevated`, `errors.platformUnsupported`
  - `a11y.settings.close`, `a11y.settings.open`
- `frontend/src/test-setup.ts` — ensure a `matchMedia` + `ResizeObserver` stub exists for the drawer tests (most likely already present from M11).

**Docs**
- `CLAUDE.md` §2.2 — remove the `Toggle: follow symlinks (default: OFF)` bullet.

## Data Model Changes

```python
class ScanOptions(BaseModel):
    include_hidden: bool = False
    include_system: bool = False
    exclude: list[str] = []  # NEW — list of fnmatch globs, matched against forward-slashed absolute paths
```

No migration required — cached scans store the *result*, not the *options*. Existing cache rows remain readable.

## API Surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/system/relaunch-admin` | Spawn elevated process; return 204 then shut down (or 409/501/403 on failure) |
| DELETE | `/api/scans` | Bulk-clear cache; 204 always (idempotent) |

Existing endpoints unchanged — `POST /api/scan` simply accepts the enriched `ScanOptions`.

## Testing Strategy — TDD-first

### Backend (pytest)

**Scanner exclusions** (`tests/unit/test_scanner_exclusions.py`)
- Fixture tree: `root/a/node_modules/x.txt`, `root/a/src/y.py`, `root/b/.cache/z.bin`.
- Assert: `exclude=[]` reproduces the baseline tree (regression guard).
- Assert: `exclude=["**/node_modules/**"]` removes the folder entirely; ancestor size drops by `x.txt`'s bytes; `total_folders` drops by 1; `total_files` drops by 1.
- Assert: multiple globs compose (`["**/node_modules/**", "**/.cache/**"]`).
- Assert: glob against a file path matches (`["**/*.bin"]`).
- Assert: invalid glob raises Pydantic `ValueError` on model construction (test the validator directly).

**Cache bulk-clear** (`tests/unit/test_cache_clear.py`)
- Seed 3 scans via `cache.put`, call `cache.clear()`, assert `list_roots() == []`.
- Call on empty cache — no error.

**Relaunch endpoint** (`tests/integration/test_relaunch_endpoint.py`)
- Monkeypatch `_relaunch_as_admin` to a recording stub. Drive through FastAPI TestClient.
- Non-Windows → 501 + `errors.platformUnsupported`.
- Windows + already admin (monkeypatch `is_admin=True`) → 409 + `errors.alreadyElevated`.
- Windows + not admin + stub returns success → 204 (or 202 — choose in impl) and stub was called with `sys.executable`.
- Windows + not admin + stub returns UAC-declined → 403 + `errors.uacDeclined`.

**Bulk-delete scans** (`tests/integration/test_scans_bulk_delete.py`)
- Seed cache, `DELETE /api/scans` → 204, `GET /api/scans` → `[]`.
- Second call on empty cache → 204 (idempotent).

**Coverage target** — `backend/core/` stays ≥ 85 %.

### Frontend (Vitest + RTL)

**`settingsStore.test.ts`** — default values, add/remove exclusion, toggle booleans persist to `localStorage`, re-hydrate on reimport.

**`ScanOptionsSection.test.tsx`** — toggles call store setters; reflect store state.

**`ExclusionsSection.test.tsx`** — empty state renders; typing + Enter adds; Add button adds; trash icon removes; duplicate globs de-duplicated; input validates empty string.

**`CacheSection.test.tsx`** — fetches `/api/scans` and renders rows; delete-one calls `DELETE /api/scan/{root_b64}`; clear-all shows confirmation → calls `DELETE /api/scans`.

**`SettingsDrawer.test.tsx`** — opens when prop true; Escape closes; focus trap (initial focus on close button); axe smoke pass.

**`AdminBadge.test.tsx`** — renders "elevated" + shield when `isAdmin=true`; "standard" + user icon when false.

**`RelaunchAdminButton.test.tsx`** — hidden on non-Windows; hidden when already admin; click opens confirmation; confirm calls `relaunchAdmin()`; error surfaces translated text.

**`ConfirmDialog.test.tsx`** — renders title/body/cta; Enter submits; Escape cancels; focus trapped while open.

### Manual verification (documented in tasks.md)
- On a real Windows box: launch Argos non-elevated → header shows "Standard user" → click Relaunch → UAC dialog → confirm → old window closes → new one opens with shield badge.
- Scan `C:\` with `**/node_modules/**` excluded; confirm `node_modules` does not appear in tree.
- Open Settings, clear all cache, reopen a previously-cached folder, observe fresh scan.
- Tab through the Settings drawer end-to-end; verify focus ring and Escape-to-close.
- OS reduce-motion → drawer opens without slide animation.

## Risks & Mitigations

- **Risk:** Shutting down the server after `ShellExecuteW` returns but before the elevated child has bound its port leaves a brief window where the user's browser errors out.
  **Mitigation:** Accept this. The new elevated process opens a new browser window (existing `main.py` behaviour); the stale tab failing is expected and called out in the user story.

- **Risk:** `ShellExecuteW` with `runas` cannot be tested on CI (no UAC). Live-fire testing only on user's machine.
  **Mitigation:** All tests monkeypatch the helper. One focused manual test in tasks.md. Keep the helper's surface tiny so what's untested is trivial.

- **Risk:** Exclusion matching inside the hot scanner loop is a perf hit on large trees.
  **Mitigation:** Early-exit when `options.exclude` is empty (the common case). Precompile nothing — `fnmatch.fnmatch` is C-optimised and already memoized internally. Benchmark with the existing scan-test fixture before shipping.

- **Risk:** `toggleHidden` in `TopMenuBar` currently lives in `explorerStore`; moving the source of truth to `settingsStore` risks double-writes / race conditions.
  **Mitigation:** Single store only — `settingsStore` becomes canonical; `explorerStore` loses the field; `TopMenuBar` reads/writes `settingsStore` directly. All callers migrated in one commit.

- **Risk:** Removing `followSymlinks` from `explorerStore` breaks tests that reference it.
  **Mitigation:** Grep + update in the same commit; the option was never wired to the scanner anyway (scanner never follows symlinks by design), so removal is safe.

- **Risk:** Invalid exclusion globs silently no-op instead of erroring, confusing the user.
  **Mitigation:** Pydantic validator catches structural issues; UI shows inline error when the backend rejects the payload. Also show a short hint (`settings.exclusions.hint`) with an example.

- **Risk:** Drawer animation interferes with jest-axe / RTL timing (M11 lesson).
  **Mitigation:** Use `useReducedMotion`; wrap test env with `matchMedia` stub returning `reduce=true` where convenient, else `await findBy*`.

- **Risk:** Lucide-react icon not found (recurring lesson).
  **Mitigation:** Use `Shield`, `ShieldAlert`, `Settings` (gear), `Trash2`, `Plus` — all verified to exist. Confirm before commit.

- **Risk:** ``axios``-equivalent (our `fetch` wrapper in `lib/api.ts`) may not currently handle 204 No Content cleanly for DELETE.
  **Mitigation:** Inspect `lib/api.ts` during implementation; reuse the pattern already used by the existing per-root `DELETE /api/scan/{root_b64}`.

## Commit Cadence & Rollback

Five atomic commits on `main`, each independently revertible:

1. `feat(backend): scan exclusion globs in ScanOptions`
2. `feat(backend): bulk cache clear + DELETE /api/scans`
3. `feat(backend): relaunch-admin endpoint (Windows ShellExecuteW runas)`
4. `feat(frontend): admin badge and relaunch-admin button`
5. `feat(frontend): settings drawer — scan options, exclusions, cache`

Plus a closing `docs(memory,claude): M12 follow-ups` commit that removes the `followSymlinks` toggle, updates CLAUDE.md §2.2, and refreshes `memory/current.md`.

## Open Questions (require user decision before I proceed)

1. **Does the top-bar `Eye`/`EyeOff` "hidden files" toggle stay as a quick shortcut (mirroring `settingsStore`), or is it removed so Settings is the only surface?**
   - *Proposal:* keep it in the top bar, but it reads/writes the same `settingsStore.include_hidden` (single source of truth). Feels like a useful one-click shortcut for a common toggle.
   - *Alternative:* remove it; rely on the drawer.

Everything else from the spec's Open Questions is already resolved; this is the one ambiguity I noticed while planning the store migration.
