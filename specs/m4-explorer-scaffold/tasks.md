# Tasks: M4 — Explorer Screen Scaffold

## Phase 1 — Tests (Red)
- [ ] Write `explorerStore.test.ts` — initial state, toggleHidden, toggleSymlinks, setViewMode
- [ ] Write `RequireScan.test.tsx` — renders children when result exists; redirects when null
- [ ] Write `TopMenuBar.test.tsx` — back nav, theme toggle, language toggle, view-mode, rescan

## Phase 2 — Implementation (Green)
- [ ] Extend `appStore.ts` with `theme`, `locale`, `setTheme`, `setLocale`
- [ ] Add `localStorage` hydration one-liner to `index.html` (flash prevention)
- [ ] Create `explorerStore.ts`
- [ ] Create `RequireScan.tsx`
- [ ] Create `TopMenuBar.tsx`
- [ ] Create `FolderTreePanel.tsx`, `ContentsPanel.tsx`, `InsightsPanel.tsx` (shells only)
- [ ] Rewrite `Explorer.tsx` with full layout + route guard + three columns
- [ ] Add i18n keys to `en.json` and `es.json`
- [ ] Boot hydration: read theme + locale from localStorage in `App.tsx` or `appStore`

## Phase 3 — Refactor
- [ ] Verify no `any` in TypeScript — fix if present
- [ ] Ensure all components use `cn()` for conditional classes
- [ ] Confirm `min-w-0` on all flex children; test at 1280px

## Phase 4 — Polish
- [ ] Run `npm run type-check` — zero errors
- [ ] Run `npm run lint` — zero warnings
- [ ] Run full frontend test suite — all green
- [ ] Manual smoke test: scan → explorer → theme toggle → lang toggle → reload → rescan → back
- [ ] Conventional commit: `feat(m4-explorer-scaffold): explorer layout + top menu (see specs/m4-explorer-scaffold)`
- [ ] Update `current.md` to point at M5
