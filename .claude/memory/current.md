# Current State — 2026-04-21

## In Progress
Feature work is complete for breadcrumbs; also carrying forward uncommitted brand-logo changes from the prior session. Nothing is in-flight — session ended with app running for manual QA.

## Last completed
- Commit 26d3100: revert lazy scanning (M14).
- This session (uncommitted):
  - Added middle-column breadcrumbs: `frontend/src/components/explorer/columns/contents/{Breadcrumbs.tsx,breadcrumbUtils.ts}` + component and utils tests under `__tests__/`.
  - `ContentsPanel.tsx` header now renders `<Breadcrumbs>` (up button + clickable segments). Falls back to the static "Contents" label until a scan exists.
  - i18n keys added: `explorer.contents.goUp`, `explorer.contents.breadcrumbsAria` in both `en.json` and `es.json`.
  - `npm run build` clean, `tsc --noEmit` clean, full vitest (258 tests) green.
- Prior session (still uncommitted): logos in `frontend/public/{logo,isotipo}.svg`, `Header.tsx`, `TopMenuBar.tsx`, `index.html`, plus canonical source in top-level `logos/`.
- Argos running in background task `bzrjfsomv` on 127.0.0.1:55589 (production build) for manual QA.

## Next step
Stop the backend (`bzrjfsomv`), then split into two commits:
1. `feat(branding): integrate ISOTIPO + LOGO SVG assets` — frontend/public/*.svg, Header.tsx, TopMenuBar.tsx, index.html.
2. `feat(contents): breadcrumb trail + parent-folder button in middle column` — Breadcrumbs.tsx, breadcrumbUtils.ts, tests, ContentsPanel.tsx, i18n keys.

## Open questions
- Commit top-level `logos/` (canonical source SVGs) or add to `.gitignore`?
- Breadcrumb overflow: currently `overflow-x-auto` on the segment list. Deep paths scroll horizontally; may want middle-ellipsis truncation instead (wait for real usage before deciding).

## Files worth reloading next session
- `frontend/src/components/explorer/columns/contents/Breadcrumbs.tsx`
- `frontend/src/components/explorer/columns/contents/breadcrumbUtils.ts`
- `frontend/src/components/explorer/columns/ContentsPanel.tsx`
- `frontend/src/i18n/en.json` / `es.json` (new keys)
