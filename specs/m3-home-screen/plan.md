# Plan: M3 — Home Screen

## Architecture Overview

The backend gains one new endpoint (`GET /api/system/info`) and one lightweight endpoint
(`GET /api/config`) that returns the per-launch auth token so the frontend can bootstrap
without the token being hardcoded or baked into the HTML at build time.

The frontend installs its runtime dependencies (zustand, react-router-dom, lucide-react,
framer-motion), then wires `App.tsx` with React Router (two routes: `/` = Home, `/explorer`
= placeholder). The Home page uses a zustand `appStore` for token + admin state and a
`scanStore` for active scan state. The folder picker uses the browser's `<input type="file"
webkitdirectory>` (cross-browser, no native dialog API needed from the browser side — the
selected directory path is read from `event.target.files[0].path` via Electron or from
Vite's dev-server passthrough; on plain browser we use `webkitRelativePath`).

> **Folder picker note**: browsers restrict access to the native filesystem path for
> security reasons. We serve a minimal `GET /api/folder-picker` endpoint that the frontend
> calls — the backend uses `tkinter.filedialog.askdirectory()` (stdlib, zero new deps) to
> open a native OS dialog and returns the selected path as JSON. This is the correct
> approach for a local Python-hosted app.

All WebSocket and HTTP calls go through a thin `frontend/src/lib/api.ts` module that reads
the token from the zustand store and attaches it automatically.

## Files Affected

### Backend (new / modified)
- `backend/api/system.py` — **new**: `GET /api/system/info` (is_admin), `GET /api/config`
  (auth token), `GET /api/folder-picker` (tkinter dialog)
- `backend/app.py` — **modify**: include `system_router`
- `backend/core/models.py` — **modify**: add `SystemInfo`, `AppConfig`, `FolderPickerResponse`

### Frontend (new / modified)
- `frontend/package.json` — **modify**: add runtime deps (zustand, react-router-dom,
  lucide-react, framer-motion)
- `frontend/src/App.tsx` — **modify**: replace placeholder with React Router setup
- `frontend/src/lib/api.ts` — **new**: typed fetch + WS helpers with auto token injection
- `frontend/src/stores/appStore.ts` — **new**: token, isAdmin, theme
- `frontend/src/stores/scanStore.ts` — **new**: activeScan state machine (idle/scanning/done/error)
- `frontend/src/pages/Home.tsx` — **new**: full home screen component
- `frontend/src/pages/Explorer.tsx` — **new**: placeholder (renders "Explorer — M4+")
- `frontend/src/components/layout/AuroraBackground.tsx` — **new**: animated mesh/aurora layer
- `frontend/src/components/layout/Header.tsx` — **new**: app name + admin shield badge
- `frontend/src/components/home/FolderPicker.tsx` — **new**: "Choose folder" button + path display
- `frontend/src/components/home/RecentScans.tsx` — **new**: list of up to 5 recent scans
- `frontend/src/components/home/ScanProgress.tsx` — **new**: progress counter + spinner
- `frontend/src/i18n/en.json` — **new**: English UI strings
- `frontend/src/i18n/es.json` — **new**: Spanish UI strings
- `frontend/src/styles/globals.css` — **modify**: add aurora keyframe animation

### Tests (new / modified)
- `tests/unit/test_system_api.py` — **new**: unit tests for system endpoints
- `tests/integration/test_api.py` — **modify**: add system/info + folder-picker smoke tests

## Data Model Changes

```python
# backend/core/models.py — additions

class SystemInfo(BaseModel):
    is_admin: bool
    platform: str  # sys.platform value

class AppConfig(BaseModel):
    token: str

class FolderPickerResponse(BaseModel):
    path: str | None  # None if user cancelled
```

```typescript
// frontend/src/lib/types.ts (new)
export interface SystemInfo { is_admin: boolean; platform: string }
export interface ScanSummary { root_path: string; scanned_at: string; total_files: number;
  total_folders: number; total_size: number; error_count: number; duration_seconds: number }
export type WsMessage =
  | { type: "progress"; node_count: number }
  | { type: "complete"; result: ScanResult }
  | { type: "error"; message: string }
```

## API Surface

### New endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/config` | none | Returns `{"token": "<launch token>"}` — called once on app boot |
| `GET` | `/api/system/info` | token | Returns `{"is_admin": bool, "platform": str}` |
| `GET` | `/api/folder-picker` | token | Opens tkinter dialog; returns `{"path": str \| null}` |

`GET /api/config` intentionally requires **no** auth — it is the bootstrap endpoint that
gives the frontend the token. It is only useful from `127.0.0.1` (enforced at server bind).

## Testing Strategy

### Unit tests (backend)
- `test_system_api.py`:
  - `GET /api/config` returns 200 with a non-empty token string.
  - `GET /api/system/info` requires valid token → 401 without it.
  - `GET /api/system/info` returns `{"is_admin": bool, "platform": "win32"|...}`.
  - `GET /api/folder-picker` returns `{"path": null}` when tkinter is unavailable
    (monkeypatch `tkinter.filedialog.askdirectory` to return `""`).

### Integration tests (backend)
- Extend `tests/integration/test_api.py` to call `/api/config` first, then use returned
  token to hit `/api/system/info` — verifies the bootstrap flow end-to-end.

### Frontend tests
- Deferred: Vitest + React Testing Library setup is its own story (M-testing). For M3,
  manual verification in the browser covers the golden path.

### Manual verification checklist
1. `python main.py` → browser opens, Home page renders with aurora background.
2. Admin shield shows correct state (run with/without elevation).
3. "Choose folder" → native dialog opens → path shown.
4. "Scan" → progress counter increments → "Done" state appears.
5. Reload page → recent scans list shows previous scan.
6. Click a recent scan → instant cache hit (no progress ticks).

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `tkinter` not available (some minimal Python installs) | Catch `ImportError`; return `{"path": null}` with a `503` and a clear error message. |
| Browser blocks `webkitdirectory` on some configs | We use the backend dialog instead — fully server-side, no browser API needed. |
| Aurora CSS animation drains battery / GPU | Keep it very low-opacity, `prefers-reduced-motion` media query disables it. |
| zustand / react-router-dom version conflicts | Pin exact versions in `package.json`; install together in one `npm install` run. |
| Token exposed in URL / localStorage | Token lives only in zustand in-memory store (not persisted) + fetched fresh each launch. |
| WS proxy not configured for `/ws/` path | Vite config already proxies `/api`; add `/ws` proxy entry. |

## Rollback Plan
All frontend changes are confined to `frontend/src/`. Backend adds one new router file.
To revert: `git revert` the M3 commit. No DB schema changes, no breaking API changes.
