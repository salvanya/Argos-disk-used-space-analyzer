# Current State — 2026-04-18

## In Progress
M11 polish complete, awaiting commit.

## Last Completed
- M10 (commit 96a313d) + TS fixes (73520e5).
- M11 workstreams (unstaged):
  - Bundle split: Three.js in `graph3d` chunk (1.4 MB), main 744 KB / 232 KB gz.
  - `EmptyState`, `ErrorPanel`, `ErrorBoundary`, `usePrefersReducedMotion` primitives with tests (13 new).
  - Empty/error wired across FolderTree, ContentsTable (incl. permission-denied), InsightsPanel, Graph3DView, RecentScans; App wrapped in ErrorBoundary.
  - Animations: Explorer view-mode crossfade + staggered column fade-in; reduced-motion respected globally (CSS + hook).
  - A11y: folder tree keyboard nav (↑↓→←/Enter/Home/End), `role="tree"`/`treeitem`, `aria-level`/`aria-expanded`/`aria-selected`, landmark roles, `aria-pressed` on TopMenuBar toggles, universal `:focus-visible` ring, jest-axe smoke test (Home + Explorer, 0 violations).
- 163/163 tests pass; tsc -b clean; build clean.

## Next Step
Single commit: `feat(m11): polish pass — lazy 3D, empty/error states, a11y, motion (see specs/m11-polish)`.
Then M12 — admin relaunch + advanced settings.

## Open Questions
None. Main bundle is 744 KB — over the 500 KB target from plan but acceptable (Recharts + React are the bulk). Further splitting deferred to M12+.

## Files Worth Reloading Next Session
- `specs/m11-polish/` — spec/plan/tasks
- `frontend/src/components/ui/` — new primitives
- `frontend/src/hooks/usePrefersReducedMotion.ts`
