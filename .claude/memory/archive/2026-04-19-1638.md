# Current State — 2026-04-19

## In Progress
None. M13 UX refinements shipped across six commits (A–F) on `main`.

## Last Completed
- **M13 complete** — all six phases on `main`:
  - `Phase A` feat(m13): attribution footer on Home and Explorer
  - `Phase B` refactor(m13): group-by precedes sort controls in contents toolbar
  - `Phase C` feat(m13): default middle-column sort to size desc
  - `Phase D` feat(m13): readable group-by dropdown via custom popover
  - `Phase E` 082f312 fix(m13): 3D sphere radius proportional to size (nodeVal = r^3)
  - `Phase F` 63cb8ee feat(m13): resizable left/right columns with invisible-until-hover handles
- Final regression check: backend `pytest` 111 passed / 4 skipped; frontend `vitest` 238 passed / 31 files; `mypy backend/core` clean; `tsc --noEmit` clean. Pre-existing ruff I001 in unrelated test files (M1/M3/M8) — not touched.

## Next Step
M14 — Lazy / on-demand scanning. Hard-blocked on:
1. User must pick pure-lazy vs lazy-first-+-background-refine (M14 Open Q #1).
2. User must decide fate of existing `POST /api/scan` route (M14 Open Q — default: route to `scan_level(root)`).

Once resolved, run `/plan` → `/tdd` per milestone.

## Open Questions
- M14 flavor (pure lazy vs hybrid refine) — still punted.
- M14 API back-compat shape.
- Full list lives in `specs/m14-lazy-scanning/spec.md` "Open Questions" section.

## Files Worth Reloading Next Session
- `specs/m14-lazy-scanning/spec.md` — 8 open questions to walk through with user.
- `backend/core/scanner.py` — `DiskScanner.scan()` becomes `scan_level()` in M14.
- `backend/core/cache.py` — schema changes for per-folder partial results.
- `CLAUDE.md §2.4` — the "complete scan" line M14 must rewrite.

## Notes on M13 Visual Tuning
- `Graph3DView.nodeVal = n.radius ** 3` (library treats nodeVal as volume → cbrt).
- `graphData.nodeRadius` unchanged (log10-scaled, min 2 / max 40). Visual verification of tuning constants deferred — revisit if a real scan looks off.
- Resize handles: invisible until hover/focus; 16-px keyboard step; Home/End jump to min/max; widths persisted to `argos-column-widths` key.
