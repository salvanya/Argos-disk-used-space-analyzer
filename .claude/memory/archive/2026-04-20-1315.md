# Current State — 2026-04-20

## In Progress
Nothing active — M14 shipped on `main` (commits through Phase L).

## Last Completed
**M14 — lazy (on-demand) scanning.** All 12 phases (A–L) landed on `main`:
- Backend: `DiskScanner.scan_level`, per-folder SQLite cache keyed by `(root, folder, options_hash)`, `POST /api/scan/level`, `DELETE /api/scan/level`; legacy `/ws/scan`, `GET /api/scan/<b64>`, `DELETE /api/scan/<b64>` removed.
- Frontend: `scanStore.levels` map + `openRoot`/`ensureLevel`/`invalidateLevel`/`rescanRoot`; tree/contents/insights/3D all fetch per-level; ForceGraph3D expands incrementally with a ring indicator on expanded nodes.
- Docs: CLAUDE.md §2.2/§2.3/§2.4/§6.6/§6.7/§10 rewritten for lazy model.
- i18n: 5 new keys under `explorer.tree.*` and `explorer.insights.*`; new `i18n/__tests__/parity.test.ts` enforces EN↔ES structural + interpolation parity.
- Tests: backend 151 pass / 5 skipped (expected symlink-privilege skips), coverage on `backend/core/` = 94.3%. Frontend 279/279. mypy + tsc + ruff clean.

## Next Step
User choice. Candidates if one's needed:
- Push the M14 range to `origin/main` (awaiting user "go").
- M11-polish / M12-admin backlog items.
- Install-wide Windows smoke test (manual run of `python main.py` on a real disk).

## Open Questions
None.

## Files Worth Reloading Next Session
- `specs/m14-lazy-scanning/spec.md` (Resolutions §1–9) + `tasks.md` (all phases checked).
- `backend/core/scanner.py` — `scan_level` is the hot path.
- `frontend/src/stores/scanStore.ts` — new M14-only shape, shim removed.
- `frontend/src/components/explorer/graph3d/Graph3DView.tsx` — incremental-expansion pattern.
