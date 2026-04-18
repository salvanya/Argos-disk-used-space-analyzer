# Tasks: M3 — Home Screen

## Phase 1 — Backend (Red → Green)

### 1a. Tests first
- [ ] Write `tests/unit/test_system_api.py`:
  - `GET /api/config` → 200, body has `token` string
  - `GET /api/system/info` without token → 401
  - `GET /api/system/info` with valid token → 200, body has `is_admin` bool + `platform` str
  - `GET /api/folder-picker` with valid token, tkinter monkeypatched to return `""` → `{"path": null}`
  - `GET /api/folder-picker` with valid token, tkinter monkeypatched to return `"C:/foo"` → `{"path": "C:/foo"}`
- [ ] Extend `tests/integration/test_api.py`: bootstrap flow (config → system/info)

### 1b. Implementation
- [ ] Add `SystemInfo`, `AppConfig`, `FolderPickerResponse` to `backend/core/models.py`
- [ ] Create `backend/api/system.py` with the three endpoints
- [ ] Register `system_router` in `backend/app.py`
- [ ] Run tests: `pytest tests/unit/test_system_api.py tests/integration/test_api.py -v`
- [ ] Run ruff + mypy: `ruff check backend/ && mypy backend/core/`

## Phase 2 — Frontend Dependencies & Routing

- [ ] Install runtime deps:
  `npm install react-router-dom zustand lucide-react framer-motion`
  (inside `frontend/`)
- [ ] Install dev deps:
  `npm install -D @types/react-router-dom`
- [ ] Update `frontend/src/App.tsx`: BrowserRouter → Route `/` → `<Home>`, Route `/explorer` → `<Explorer>`
- [ ] Create `frontend/src/pages/Explorer.tsx`: placeholder div
- [ ] Add `/ws` proxy to `frontend/vite.config.ts`

## Phase 3 — State & API Layer

- [ ] Create `frontend/src/lib/types.ts`: TypeScript interfaces (SystemInfo, ScanSummary, WsMessage, ScanResult)
- [ ] Create `frontend/src/lib/api.ts`: `fetchConfig()`, `fetchSystemInfo()`, `openFolderPicker()`, `listScans()`, `connectScanWs()`
- [ ] Create `frontend/src/stores/appStore.ts`: token, isAdmin, setToken, setIsAdmin
- [ ] Create `frontend/src/stores/scanStore.ts`: status (idle/scanning/done/error), nodeCount, result, selectedPath
- [ ] Bootstrap: `App.tsx` calls `fetchConfig()` on mount → stores token → calls `fetchSystemInfo()`

## Phase 4 — UI Components

- [ ] Create `frontend/src/components/layout/AuroraBackground.tsx`
- [ ] Create `frontend/src/components/layout/Header.tsx` (app name + admin shield)
- [ ] Create `frontend/src/components/home/FolderPicker.tsx` (button + selected path display)
- [ ] Create `frontend/src/components/home/RecentScans.tsx` (list, formatted size + date)
- [ ] Create `frontend/src/components/home/ScanProgress.tsx` (spinner + node count + done state)
- [ ] Create `frontend/src/pages/Home.tsx` (assembles all components)
- [ ] Add aurora keyframe to `frontend/src/styles/globals.css`

## Phase 5 — i18n

- [ ] Create `frontend/src/i18n/en.json` with all Home screen string keys
- [ ] Create `frontend/src/i18n/es.json` with Spanish translations
  (Note: react-i18next setup is part of this phase if not already installed)

## Phase 6 — Polish & Verify

- [ ] `prefers-reduced-motion` CSS rule disables aurora animation
- [ ] Manual checklist from plan.md §Testing Strategy (all 6 items pass)
- [ ] `npm run typecheck` → zero errors
- [ ] `ruff check backend/ && mypy backend/core/` → clean
- [ ] `pytest --tb=short` → all tests pass
- [ ] Conventional commit: `feat(m3-home-screen): home page with folder picker, recent scans, admin shield (see specs/m3-home-screen)`
- [ ] Update `.claude/memory/current.md`
