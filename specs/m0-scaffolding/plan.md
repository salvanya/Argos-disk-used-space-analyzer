# Plan: M0 — Project Scaffolding

**Feature slug:** `m0-scaffolding`
**Date:** 2026-04-16
**Status:** Awaiting approval

---

## 1. Objective

Stand up a complete, working skeleton for Argos so that every subsequent milestone
has a solid foundation to build on. After M0 is done, `python main.py` must:

1. Start a FastAPI server bound to `127.0.0.1` on a random free port.
2. Generate a per-launch auth token and store it in the app state.
3. Serve the pre-built frontend (or a placeholder page if no build exists).
4. Auto-open the browser at `http://127.0.0.1:<port>/?token=<token>`.
5. Respond to `GET /api/health` with `{ "status": "ok", "version": "0.1.0" }`.
6. Shut down cleanly on SIGINT/Ctrl+C.

The frontend scaffold (Vite + React) must:

1. Be initialized with TypeScript, Tailwind, shadcn/ui base, Geist font.
2. Show a minimal placeholder page ("Argos is running…").
3. Have `npm run dev` working with a proxy to the backend (port from env).
4. Have `npm run build` producing output into `backend/static/`.

---

## 2. Files to Create or Modify

### Python / Backend

| File | Action | Notes |
|---|---|---|
| `main.py` | Modify | Replace stub with real launcher logic |
| `backend/__init__.py` | Create | Empty, marks package |
| `backend/app.py` | Create | `create_app()` factory — FastAPI instance, routers, CORS for dev, static files mount |
| `backend/config.py` | Create | `Settings` (pydantic-settings) — host, port, log level, cache db path, auto-open, include-hidden |
| `backend/api/__init__.py` | Create | Empty |
| `backend/api/health.py` | Create | `GET /api/health` router |
| `backend/core/__init__.py` | Create | Empty |
| `backend/core/errors.py` | Create | Base exception hierarchy (`ArgosError`, `ScanError`, etc.) |
| `backend/core/models.py` | Create | Placeholder Pydantic models (will grow in M1) |
| `tests/__init__.py` | Create | Empty |
| `tests/conftest.py` | Create | Shared fixtures: `app`, `async_client` |
| `tests/unit/__init__.py` | Create | Empty |
| `tests/integration/__init__.py` | Create | Empty |
| `tests/integration/test_health.py` | Create | Integration test for `GET /api/health` |
| `tests/fixtures/` | Create (dir) | Empty dir; scanner fixtures go here in M1 |

### Frontend

| File | Action | Notes |
|---|---|---|
| `frontend/package.json` | Create | Vite + React + TS + Tailwind + dependencies |
| `frontend/tsconfig.json` | Create | Strict TS config |
| `frontend/tsconfig.node.json` | Create | For vite config |
| `frontend/vite.config.ts` | Create | Build to `../backend/static`, dev proxy to backend |
| `frontend/tailwind.config.ts` | Create | Dark mode, Geist font, custom tokens from design system |
| `frontend/postcss.config.js` | Create | Autoprefixer |
| `frontend/index.html` | Create | Root HTML, Geist font link |
| `frontend/src/main.tsx` | Create | React root mount |
| `frontend/src/App.tsx` | Create | Root component (placeholder) |
| `frontend/src/styles/globals.css` | Create | Tailwind directives, CSS variables for design system |
| `frontend/public/` | Create (dir) | Empty; favicon goes here |

### Root / Config

| File | Action | Notes |
|---|---|---|
| `pyproject.toml` | Modify | Add `backend.api` and `backend.core` to `packages`; verify setuptools find_packages |
| `README.md` | Modify | Add dev setup instructions (M0 completion artifact) |
| `.gitignore` | Verify | Already present; confirm `node_modules/`, `dist/`, `backend/static/`, `*.db`, `.env` are listed |

---

## 3. Architecture Decisions for M0

### 3.1 Token-based Auth
- A cryptographically random 32-byte token is generated at startup via `secrets.token_urlsafe(32)`.
- Stored in FastAPI app state: `app.state.auth_token`.
- Required on every API call as a query parameter `?token=<t>` or `Authorization: Bearer <t>` header.
- A FastAPI dependency `require_token` enforces this on all non-health routes.
- The health endpoint is intentionally unauthenticated (needed by the browser before it has the token).

### 3.2 Port Selection
- `ARGOS_PORT=0` (default) → bind to port 0, let the OS pick a free port, then read the actual port back from the socket.
- The chosen port is written to stdout and passed in the browser URL.

### 3.3 Frontend Build Integration
- In production: `backend/app.py` mounts `backend/static/` with `StaticFiles(html=True)`.
- In dev: Vite runs at `localhost:5173` with `server.proxy` pointing `/api` at the backend.
- `main.py` detects dev mode via `ARGOS_DEV=true` env var (or absence of `backend/static/index.html`).
- In dev mode, browser is opened at the Vite URL (port 5173), not the backend URL.

### 3.4 Graceful Shutdown
- Uvicorn's `lifespan` context manager used for startup/shutdown hooks.
- On shutdown: log "Argos shutting down…" — no cleanup needed yet (cache not implemented until M1).

---

## 4. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `pywin32` import fails on non-Windows CI | Medium | Low | Guard all `pywin32` imports with `sys.platform == "win32"` checks |
| Port 0 not supported in some Windows firewall configs | Low | Medium | Fallback to port 8765 if binding port 0 fails |
| `backend/static/` missing at first run (no frontend build yet) | High | Low | Mount static files only if dir exists; show fallback JSON response otherwise |
| Vite proxy config points at wrong backend port | Medium | Low | Read backend port from `VITE_BACKEND_PORT` env var (set in dev launch script) |
| `asyncio_mode = "auto"` in pytest causes issues with sync tests | Low | Low | Use `pytest-asyncio` `auto` mode consistently; all async test functions automatically wrapped |
| `filterwarnings = ["error"]` in pytest breaks on third-party deprecation warnings | Medium | Medium | Add fine-grained ignores for `uvicorn`, `fastapi`, `starlette` as discovered |

---

## 5. Testing Strategy (TDD-first)

M0 tests are minimal but must pass before implementation is considered done.

### 5.1 Integration Tests — `tests/integration/test_health.py`

Written **before** the health route is implemented:

```
test_health_returns_200
test_health_body_has_status_ok
test_health_body_has_version
test_health_no_token_required
```

These use an `async_client` fixture that creates the FastAPI app in test mode
(no browser open, no Uvicorn — just `httpx.AsyncClient(app=app, base_url=...)`).

### 5.2 Unit Tests — `tests/unit/test_config.py` (NEW, not in original plan)

```
test_default_host_is_127001
test_host_cannot_be_0000  # Security: must reject 0.0.0.0
test_log_level_defaults_to_info
```

### 5.3 Frontend (Vitest)

Not implemented in M0. The only frontend verification is manual:
- `npm run dev` starts without errors.
- Placeholder page renders in browser.
- `npm run build` succeeds and outputs to `backend/static/`.

### 5.4 CI check (manual for now — no CI pipeline yet)

Run sequence: `ruff check . && ruff format --check . && mypy backend/core/ && pytest --cov=backend --cov-report=term-missing`

---

## 6. Implementation Order (step-by-step)

1. **Write failing tests** (`tests/conftest.py`, `tests/integration/test_health.py`, `tests/unit/test_config.py`).
2. **Create `backend/core/errors.py`** — exception hierarchy (needed by config validation).
3. **Create `backend/config.py`** — `Settings` with host validation.
4. **Create `backend/api/health.py`** — health router.
5. **Create `backend/app.py`** — `create_app()` factory wiring everything together.
6. **Update `main.py`** — launcher (port selection, token gen, browser open, Uvicorn start).
7. **Run tests** — all green.
8. **Run ruff + mypy** — all clean.
9. **Initialize frontend** — `npm create vite@latest`, configure Tailwind, shadcn base, Geist.
10. **Configure `vite.config.ts`** — build output to `backend/static/`, dev proxy.
11. **Write `frontend/src/styles/globals.css`** — design system tokens (from CLAUDE.md §5).
12. **Write placeholder `App.tsx`** — minimal "Argos is running" page.
13. **Manual smoke test** — `python main.py`, browser opens, health endpoint responds.
14. **Commit** — `chore: M0 scaffolding complete`.

---

## 7. Out of Scope for M0

- Scanning engine (M1).
- WebSocket progress updates (M2).
- Any real UI beyond a placeholder (M3+).
- Admin detection (M3).
- i18n wiring (M9).
- 3D graph (M10).
