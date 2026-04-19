# Current State — 2026-04-19

## In Progress
**M14 — lazy (on-demand) scanning.** Spec open questions resolved; about to run `/plan`.

## Last Completed
- M13 shipped (`b809a05..d0343b4` on `origin/main`).
- `specs/m14-lazy-scanning/spec.md` — all 8 open questions resolved into a "Resolutions" section:
  - Q1 Flavor → **pure lazy (a)**. Folder children have `size=None` until expanded.
  - Q2 `POST /api/scan` → **removed** (not aliased). `DiskScanner.scan()` stays in core for tests/benchmarks; future `POST /api/scan/deep` only if user-facing deep-scan is actually needed.
  - Q3–Q8 → accepted proposed defaults. Added Q9 deferring `GET /api/scan/level` alias.
- Goals/Acceptance sections updated to reference Resolutions instead of open questions.

## Next Step
Run `/plan` for M14 using the now-closed spec. Plan should cover:
- Scanner: add `scan_level`, keep `scan`.
- Models: `LevelScanResult`, folder children with nullable `size`.
- Cache: per-folder schema keyed by `(root_path, folder_path)`, migration from M12 eager-scan cache.
- API: add `POST /api/scan/level`, remove `POST /api/scan`, keep `/ws/scan`.
- Frontend: tree/middle/3D rewired to per-level fetches, per-folder rescan right-click, "—" for unknown.
- Docs: rewrite CLAUDE.md §2.4 in the same series.
- Tests + ≥85% coverage on `backend/core/`.

## Open Questions
None blocking. `/plan` will surface any implementation-level questions.

## Files Worth Reloading Next Session
- `specs/m14-lazy-scanning/spec.md` — now contains Resolutions §1–9.
- `.claude/memory/decisions/0005-lazy-scanning-over-full-scan.md` — direction decision.
- `backend/core/scanner.py`, `backend/core/cache.py`, `backend/core/models.py` — main edit sites.
- `CLAUDE.md §2.4` — the "complete scan" line to rewrite.
