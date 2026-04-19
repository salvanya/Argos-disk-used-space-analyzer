# Current State — 2026-04-19

## In Progress
None. M13 shipped end-to-end — all six phases committed and pushed to `origin/main`.

## Last Completed
- Pushed `b809a05..d0343b4` (9 commits) to `origin/main`.
- `d0343b4 docs(m13): close out M13` — tasks checked off, memory snapshot refreshed.
- `63cb8ee feat(m13): resizable left/right columns with invisible-until-hover handles` (Phase F).
- `082f312 fix(m13): 3D sphere radius proportional to size (nodeVal = r^3)` (Phase E).
- Earlier M13 phases A–D committed in the same session.
- Final regression baseline: `pytest` 111 pass / 4 skipped, `vitest` 238/238, `mypy backend/core` clean, `tsc --noEmit` clean. Pre-existing ruff I001 in test_filesystem_api / test_system_api / test_windows_utils (from M1/M3/M8) — untouched.

## Next Step
Start **M14 — lazy / on-demand scanning**. Hard-blocked on:
1. Pure-lazy vs lazy-first-+-background-refine (M14 spec Open Q #1).
2. Fate of existing `POST /api/scan` — default proposal is to route it to `scan_level(root)` for back-compat.

Walk the user through the remaining open questions in `specs/m14-lazy-scanning/spec.md` before `/plan`.

## Open Questions
- All M14 open questions remain unresolved (see spec §Open Questions).

## Files Worth Reloading Next Session
- `specs/m14-lazy-scanning/spec.md` — 8 open questions to resolve.
- `.claude/memory/decisions/0005-lazy-scanning-over-full-scan.md` — why we're reversing CLAUDE.md §2.4.
- `backend/core/scanner.py` — `DiskScanner.scan()` becomes `scan_level()`.
- `backend/core/cache.py` — schema changes needed for per-folder partial results.
- `CLAUDE.md §2.4` — the "complete scan" line M14 must rewrite.
