# Plan: M2 — API Layer

## Architecture Overview

A `scan` API router is added to the existing FastAPI app. HTTP endpoints handle
cache reads, cache listing, and cache eviction. A separate WebSocket endpoint handles
scan execution: it receives a `ScanStartRequest`, runs `DiskScanner.scan` in
`loop.run_in_executor` (thread pool), feeds progress ticks via a `queue.Queue`
→ `asyncio.Queue` bridge, streams them to the client, then caches and returns the
`ScanResult`. Auth is enforced by a `verify_token` FastAPI dependency on all
non-health routes.

## Files Affected

### New files
- `backend/api/scan.py` — HTTP + WebSocket scan endpoints
- `backend/api/dependencies.py` — shared `verify_token` + `get_cache` dependencies
- `tests/integration/test_api_scan.py` — HTTP endpoint integration tests
- `tests/integration/test_ws_scan.py` — WebSocket integration tests

### Modified files
- `backend/app.py` — register scan router; create `ScanCache` in lifespan and attach to `app.state`
- `backend/core/models.py` — add `ScanStartRequest`, `ScanSummary`, `WsProgressMessage`, `WsCompleteMessage`, `WsErrorMessage`
- `backend/config.py` — no code changes (already has `cache_db`, `host`, `port`)

## Data Model Changes

### New Pydantic models (`backend/core/models.py`)

```python
class ScanStartRequest(BaseModel):
    root: str           # absolute path, will be coerced to Path
    options: ScanOptions = ScanOptions()
    force_rescan: bool = False

class ScanSummary(BaseModel):
    root_path: str
    scanned_at: datetime
    total_files: int
    total_folders: int
    total_size: int
    error_count: int
    duration_seconds: float

# WebSocket message envelope — discriminated union via `type` field
class WsProgressMessage(BaseModel):
    type: Literal["progress"] = "progress"
    node_count: int

class WsCompleteMessage(BaseModel):
    type: Literal["complete"] = "complete"
    result: ScanResult

class WsErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    message: str
```

## API Surface

### Authentication
All endpoints except `GET /api/health` require header `X-Argos-Token: <token>`.
Token is `app.state.auth_token` (set to `secrets.token_urlsafe(32)` on each launch).
Missing/wrong token → `401 Unauthorized`.

For the WebSocket, the token is passed in the **first JSON message** (field `token`).
If invalid, server closes with code `4401`.

### HTTP endpoints (`prefix="/api"`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check (existing) |
| GET | `/scans` | Token | List all cached scans → `list[ScanSummary]` |
| GET | `/scan/{root_b64}` | Token | Get cached result → `ScanResult` or 404 |
| DELETE | `/scan/{root_b64}` | Token | Evict cache entry → 204 |

`root_b64`: the root path base64url-encoded (standard alphabet, no padding).

### WebSocket endpoint

| Path | Auth | Description |
|------|------|-------------|
| `WS /ws/scan` | First message | Stream scan progress, return result |

**First WS message (client → server):**
```json
{
  "token": "<auth_token>",
  "root": "C:/Users/me/Documents",
  "options": {"include_hidden": false, "include_system": false},
  "force_rescan": false
}
```

**Server → client messages (streamed):**
```json
{"type": "progress", "node_count": 42}
{"type": "complete", "result": { ...ScanResult... }}
{"type": "error", "message": "Root path does not exist: C:/bad/path"}
```

## Progress Queue Pattern

```
Thread pool (DiskScanner.scan)
    │  progress_callback(node_count)
    │       │
    │  loop.call_soon_threadsafe(sync_q.put_nowait, count)
    │                                 │
AsyncIO event loop               asyncio.Queue
    │  await async_q.get()            │
    │  ws.send_text(WsProgressMessage)│
    └─────────────────────────────────┘
```

Concretely:
1. Before calling `run_in_executor`, create `asyncio.Queue`.
2. `progress_callback` calls `loop.call_soon_threadsafe(queue.put_nowait, count)`.
3. Async producer task reads from queue and sends `WsProgressMessage` over the socket.
4. `None` sentinel sent after executor future completes to signal the producer to stop.
5. `asyncio.gather` on both the executor future and the producer task.

## `app.py` Changes

```python
@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    db_path = Path(settings.cache_db)
    app.state.cache = ScanCache(db_path)
    logger.info("Argos starting up (token omitted from logs)")
    yield
    logger.info("Argos shutting down")
```

`get_settings()` will use `@lru_cache` in `config.py` to avoid re-reading env on every call.

## Testing Strategy

### Unit tests — none new needed
Scanner and cache are already tested at 94.3% coverage.
Auth logic is a pure function — tested inline in integration tests.

### Integration tests — `tests/integration/test_api_scan.py`
All use `ASGITransport` pattern (no `app=` shortcut — see lessons/httpx-asgi-transport.md).
Fixtures:
- `app` (from `conftest.py`) — re-use existing
- `async_client` — re-use existing but extend to pass auth token
- `auth_token` fixture that reads `app.state.auth_token`
- `authed_client` fixture: `async_client` with `X-Argos-Token` header pre-set
- `seeded_cache` fixture: calls `cache.put(result)` with a known `ScanResult`

Tests (red-first):
1. `test_get_scans_empty` — 200, empty list
2. `test_get_scans_with_entries` — 200, correct summaries
3. `test_get_scan_cached` — 200, correct `ScanResult`
4. `test_get_scan_not_found` — 404
5. `test_get_scan_bad_b64` — 422
6. `test_delete_scan_existing` — 204, then GET returns 404
7. `test_delete_scan_nonexistent` — 204 (idempotent)
8. `test_auth_missing_token` — 401 on each protected endpoint
9. `test_auth_wrong_token` — 401

### WebSocket integration tests — `tests/integration/test_ws_scan.py`
Use `async_client` (httpx `WebSocketSession` via `ASGITransport`).
Fixtures:
- `make_tree` (from `conftest.py`)

Tests:
1. `test_ws_scan_fresh` — scan a fixture tree; receive ≥1 progress messages; final message is `complete` with correct `total_files`
2. `test_ws_scan_cached_no_rescan` — seed cache, connect with `force_rescan=false`; receive `complete` immediately (no `progress` messages)
3. `test_ws_scan_force_rescan` — seed cache, connect with `force_rescan=true`; receive `progress` messages; result overwrites cache
4. `test_ws_scan_bad_root` — non-existent path; receive `error` message
5. `test_ws_scan_invalid_token` — WS closes with code 4401
6. `test_ws_scan_missing_token` — WS closes with code 4401

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `run_in_executor` blocks event loop on very large scans | Confirmed acceptable per Decision 0003; progress queue keeps WS alive |
| Thread-safety of `asyncio.Queue` | Use `loop.call_soon_threadsafe` — the canonical pattern |
| httpx WebSocket test support | httpx ≥ 0.23 supports `async with client.websocket_connect(url)` over ASGITransport |
| Base64 encoding edge cases (padding, Windows paths with backslashes) | Normalise to forward slashes before encoding; use `base64.urlsafe_b64encode`, strip `=` padding; decode defensively with try/except → 422 |
| SQLite write from lifespan vs requests | `ScanCache` uses `sqlite3` (synchronous); safe to call from both lifespan and request handlers since they run serially in the event loop thread |

## Rollback Plan
All new code is additive. Reverting `backend/app.py` to exclude the scan router and
removing `backend/api/scan.py` and `backend/api/dependencies.py` restores M1 state.
The SQLite cache file is independent and unaffected.
