# Current State — 2026-04-20

## In Progress
**M14 rollback** in final verification. Backend + frontend code + tests restored to the pre-M14 baseline (`d0343b4`) via `git checkout`. UX/UI polish from M13/M14 is preserved. Need to: build frontend → run full test + type suite → commit → push.

## Last Completed
**M14 — lazy (on-demand) scanning** shipped on 2026-04-20 but was **rolled back the same day** because folder sizes appeared as "—" until each level was expanded individually, which the user found unusable.

- Rollback scope: `backend/core/{scanner,models,cache,windows_utils}.py`, `backend/api/scan.py`, `backend/app.py`, all frontend stores/types/api/components/tests, i18n EN/ES, `CLAUDE.md`, `pyproject.toml`, and every test file touched by M14. Done via `git checkout d0343b4 -- <files>`.
- Deleted M14-only files: `useFocusedLevel.ts`, `TreeContextMenu.tsx`, `scanStore.test.ts`, `test_scanner_level.py`, `test_models.py`.
- Kept: `frontend/src/i18n/__tests__/parity.test.ts` (M14-introduced safety net; M14-specific describe block trimmed), `.claude/memory/archive/2026-04-19-*.md` + `2026-04-20-m14-shipped.md`, `.claude/memory/lessons/*.md`, and `specs/m14-lazy-scanning/*` (kept as reference).
- `CLAUDE.md §10` item 15 now documents the rollback.

## Next Step
1. `cd frontend && npm run build` to regenerate `backend/static/` from the recursive-scan code.
2. `ruff check`, `mypy backend/core`, `pytest`, `cd frontend && npm test`, `npm run typecheck`.
3. Commit the rollback as a small series of atomic commits; push to `origin/main`.
4. Smoke-test with `python main.py` on a real folder to confirm sizes render correctly.

## Open Questions
- Should `.claude/memory/lessons/force-graph-nodethreeobject-extend.md` stay? It captures a generic three.js lesson worth keeping even though the M14 code path is gone — leaning yes.
- Do we ever want to revisit lazy scanning? If yes, it needs a UX plan for the "direct children known, grand-children unknown" state (e.g., show partial size with a "+ N more pending" affordance, or scan asynchronously in the background). Not a priority.

## Files Worth Reloading Next Session
- `CLAUDE.md §2.4 + §6.6 + §6.7 + §10` — authoritative recursive-scan model.
- `backend/core/scanner.py` — `DiskScanner.scan` recursive walker.
- `backend/api/scan.py` — REST + `/ws/scan` WebSocket progress channel.
- `frontend/src/stores/scanStore.ts` — single `result: ScanResult | null` shape.
- `specs/m14-lazy-scanning/spec.md` — reference only; implementation is dead for now.
