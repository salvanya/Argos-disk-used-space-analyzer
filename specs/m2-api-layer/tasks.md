# Tasks: M2 — API Layer

## Phase 1 — Models (prerequisite, no tests needed)
- [ ] Add `ScanStartRequest`, `ScanSummary`, `WsProgressMessage`, `WsCompleteMessage`, `WsErrorMessage` to `backend/core/models.py`

## Phase 2 — Tests (Red)

### HTTP tests (`tests/integration/test_api_scan.py`)
- [ ] `test_auth_missing_token` — 401 on GET /api/scans with no token
- [ ] `test_auth_wrong_token` — 401 on GET /api/scans with wrong token
- [ ] `test_get_scans_empty` — 200, empty list
- [ ] `test_get_scans_with_entries` — 200, returns correct ScanSummary fields
- [ ] `test_get_scan_cached` — 200, returns full ScanResult JSON
- [ ] `test_get_scan_not_found` — 404 when no cache entry exists
- [ ] `test_get_scan_bad_b64` — 422 on malformed root_b64
- [ ] `test_delete_scan_existing` — 204; subsequent GET returns 404
- [ ] `test_delete_scan_nonexistent` — 204 (idempotent)

### WebSocket tests (`tests/integration/test_ws_scan.py`)
- [ ] `test_ws_scan_invalid_token` — WS closes with code 4401
- [ ] `test_ws_scan_missing_token` — WS closes with code 4401
- [ ] `test_ws_scan_bad_root` — non-existent path → `{type: "error"}` message
- [ ] `test_ws_scan_fresh` — real fixture tree; receives progress + complete; result has correct total_files
- [ ] `test_ws_scan_cached_no_rescan` — cached result; receives `complete` immediately
- [ ] `test_ws_scan_force_rescan` — cached result; force_rescan=true → receives progress; cache overwritten

## Phase 3 — Implementation (Green)

- [ ] `backend/api/dependencies.py` — `verify_token(request, x_argos_token)` + `get_cache(request)` + `get_settings(request)`
- [ ] `backend/api/scan.py` — router with `GET /scans`, `GET /scan/{root_b64}`, `DELETE /scan/{root_b64}`
- [ ] `backend/api/scan.py` — `WS /ws/scan` endpoint with progress queue pattern
- [ ] `backend/app.py` — register scan router; create cache in lifespan; add `@lru_cache` to `get_settings()`
- [ ] `backend/config.py` — add `get_settings()` factory with `@lru_cache`

## Phase 4 — Refactor
- [ ] Ensure `ScanCache` call sites in endpoints use `run_in_executor` if SQLite latency becomes observable (benchmark first; likely unnecessary)
- [ ] Extract `_b64_to_path(root_b64: str) -> Path` helper used by GET + DELETE to keep route handlers thin

## Phase 5 — Polish
- [ ] Run `ruff check --fix` + `ruff format`
- [ ] Run `mypy backend/` — fix any new errors
- [ ] Run full test suite: `pytest -x --cov=backend/core --cov=backend/api`
- [ ] Verify coverage ≥ 85% on `backend/api/`
- [ ] Conventional commit: `feat(m2-api-layer): HTTP + WebSocket scan API (see specs/m2-api-layer)`
- [ ] Update `.claude/memory/current.md`
