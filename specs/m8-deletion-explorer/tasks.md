# Tasks: M8 — Deletion + Explorer Integration

## Phase 1 — Tests (Red)

### Backend
- [ ] `tests/unit/test_windows_utils.py` — failing test for `open_in_explorer` (mock subprocess)
- [ ] `tests/unit/test_filesystem_api.py` — failing test: `POST /api/fs/open` returns 204
- [ ] `tests/unit/test_filesystem_api.py` — failing test: `DELETE /api/fs/item` with `confirm=False` → 422
- [ ] `tests/unit/test_filesystem_api.py` — failing test: recycle-bin deletion (mock send2trash)
- [ ] `tests/unit/test_filesystem_api.py` — failing test: permanent deletion of file (mock os.remove)
- [ ] `tests/unit/test_filesystem_api.py` — failing test: permanent deletion of dir (mock shutil.rmtree)
- [ ] `tests/unit/test_filesystem_api.py` — failing test: OSError → 400

### Integration
- [ ] `tests/integration/test_api.py` — failing test: DELETE a real temp file via API

### Frontend
- [ ] `DeleteConfirmModal.test.tsx` — renders item name; cancel works; confirm(permanent=false); confirm(permanent=true) with warning

## Phase 2 — Implementation (Green)

### Backend
- [ ] `backend/core/windows_utils.py` — implement `open_in_explorer(path: Path) -> None`
- [ ] `backend/core/models.py` — add `OpenRequest` and `DeleteRequest`
- [ ] `backend/api/filesystem.py` — implement `POST /api/fs/open` and `DELETE /api/fs/item`
- [ ] `backend/app.py` — register `filesystem.router` under `/api`

### Frontend
- [ ] `frontend/src/lib/api.ts` — add `openInExplorer(path)` and `deleteItem(path, permanent)`
- [ ] `frontend/src/stores/scanStore.ts` — add `removeNode(path)` action
- [ ] `frontend/src/components/explorer/columns/contents/DeleteConfirmModal.tsx` — implement modal
- [ ] `frontend/src/components/explorer/columns/contents/ContextMenu.tsx` — add props + enable buttons
- [ ] `frontend/src/components/explorer/columns/contents/ContentsTable.tsx` — wire handlers + modal

## Phase 3 — i18n
- [ ] `frontend/src/i18n/en.json` — add `explorer.contents.deleteConfirm.*` keys
- [ ] `frontend/src/i18n/es.json` — Spanish equivalents

## Phase 4 — Polish & Verification
- [ ] Run `pytest --tb=short -q` — all backend tests pass
- [ ] Run `npm run test -- --run` in `frontend/` — all frontend tests pass
- [ ] Run `npm run typecheck` in `frontend/` — no type errors
- [ ] Run `ruff check backend/` + `mypy backend/core/` — clean
- [ ] Manual smoke test (see plan.md § Manual Verification)
- [ ] Conventional commit: `feat(m8-deletion-explorer): deletion + open-in-explorer (see specs/m8-deletion-explorer)`
- [ ] Update `.claude/memory/current.md`
