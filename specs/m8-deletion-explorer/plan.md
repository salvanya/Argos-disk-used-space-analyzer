# Plan: M8 — Deletion + Explorer Integration

## Architecture Overview
A new FastAPI router (`backend/api/filesystem.py`) exposes two endpoints: `POST /api/fs/open`
and `DELETE /api/fs/item`. `windows_utils.py` gains an `open_in_explorer` helper. The frontend
wires the two disabled context-menu buttons via a new `DeleteConfirmModal` component and two API
call helpers added to `lib/api.ts`. After successful deletion, the item is removed from the scan
store's in-memory tree so the UI reflects the change immediately.

## Files Affected

### Backend (new / modified)
- `backend/core/windows_utils.py` — add `open_in_explorer(path: Path) -> None`
- `backend/core/models.py` — add `OpenRequest` and `DeleteRequest` Pydantic models
- `backend/api/filesystem.py` (**new**) — `POST /api/fs/open` and `DELETE /api/fs/item` endpoints
- `backend/app.py` — register `filesystem.router` with prefix `/api`

### Frontend (new / modified)
- `frontend/src/lib/api.ts` — add `openInExplorer(path)` and `deleteItem(path, permanent)` helpers
- `frontend/src/stores/scanStore.ts` — add `removeNode(path)` action for optimistic removal
- `frontend/src/components/explorer/columns/contents/DeleteConfirmModal.tsx` (**new**) — confirmation dialog
- `frontend/src/components/explorer/columns/contents/ContextMenu.tsx` — add `onDelete` / `onOpenInExplorer` props; enable those buttons
- `frontend/src/components/explorer/columns/contents/ContentsTable.tsx` — wire delete + open handlers; manage `deleteTarget` state
- `frontend/src/i18n/en.json` — add `explorer.contents.deleteConfirm.*` keys
- `frontend/src/i18n/es.json` — Spanish translations for the same keys

### Tests (new)
- `tests/unit/test_windows_utils.py` — add tests for `open_in_explorer`
- `tests/unit/test_filesystem_api.py` (**new**) — unit tests for both endpoints
- `tests/integration/test_api.py` — add integration tests for the new endpoints
- `frontend/src/components/explorer/columns/contents/__tests__/DeleteConfirmModal.test.tsx` (**new**)
- `frontend/src/components/explorer/columns/contents/__tests__/ContentsTable.test.tsx` — extend with delete/open tests

## Data Model Changes

### Backend (`backend/core/models.py`)
```python
class OpenRequest(BaseModel):
    path: str

class DeleteRequest(BaseModel):
    path: str
    permanent: bool = False
    confirm: bool  # must be True; 422 if False
```

### Frontend (no new types; uses `string` path and `boolean` permanent flag)

## API Surface

### `POST /api/fs/open`
- Auth: `X-Argos-Token` header (same as all other authed endpoints)
- Request body: `{"path": "<absolute path>"}`
- Response: `204 No Content` on success
- Errors: `422` if path missing; `400` if `open_in_explorer` fails (non-Windows or subprocess error)

### `DELETE /api/fs/item`
- Auth: `X-Argos-Token` header
- Request body: `{"path": "<absolute path>", "permanent": false, "confirm": true}`
- Response: `204 No Content` on success
- Errors: `422` if `confirm` is not `true` or path missing; `400` with detail if deletion fails (permission denied, path not found, etc.)

## Testing Strategy

### Backend unit tests (`tests/unit/test_filesystem_api.py`)
- `open_in_explorer` with mocked `subprocess.Popen` — verifies correct args on Windows; no-op on non-Windows.
- `POST /api/fs/open` returns 204; bad path returns 400.
- `DELETE /api/fs/item` with `confirm=False` returns 422.
- `DELETE /api/fs/item` Recycle Bin path: mock `send2trash.send2trash`, assert called with correct path.
- `DELETE /api/fs/item` permanent path: mock `os.remove` / `shutil.rmtree`, assert called.
- `DELETE /api/fs/item` returns 400 when underlying deletion raises `OSError`.

### Integration tests (`tests/integration/test_api.py`)
- DELETE a real file in a temp fixture directory via the API; verify file no longer exists.

### Frontend unit tests
- `DeleteConfirmModal`: renders item name; Cancel closes without calling onConfirm; Confirm calls
  onConfirm with `permanent=false` by default; checking the checkbox + confirm calls with
  `permanent=true`; permanent-warning text visible when checkbox checked.
- `ContentsTable` (extended): right-click → delete opens modal; confirmed delete calls
  `deleteItem` API and removes node from store.

### Manual verification
1. `python main.py` with a real folder.
2. Right-click a file → Open in Explorer — Explorer opens with file selected.
3. Right-click a file → Delete → cancel → file still there.
4. Right-click a file → Delete → confirm → file gone from list.
5. Right-click a folder → Delete permanently → check box → warning appears → confirm → folder gone.
6. Right-click a path that no longer exists → error message shown, no crash.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `send2trash` not installed | It's already a declared dependency from M0 scaffolding — `pyproject.toml`. |
| `shutil.rmtree` on a large folder may block the event loop | Run in `asyncio.get_event_loop().run_in_executor(None, ...)` to keep the server responsive. |
| `explorer /select,<path>` fails with non-ASCII paths | Use `subprocess.Popen` with `str(path)` — Python's subprocess handles Unicode on Windows. |
| Optimistic removal leaves stale parent sizes | Accepted trade-off; user can Rescan. Noted in spec Non-Goals. |
| Permanent delete has no undo | Confirmed by double-gated UI: checkbox + explicit confirm click. |

## Rollback Plan
- The new `filesystem.py` router is additive — removing its `include_router` call from `app.py`
  and disabling the buttons in `ContextMenu.tsx` fully reverts the feature.
- No DB schema changes are made; no data loss risk on rollback.
