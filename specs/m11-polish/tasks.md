# Tasks: M11 — Polish

Single commit at the end: `feat(m11): polish pass — lazy 3D, empty/error states, a11y, motion (see specs/m11-polish)`.

## Phase 0 — Setup
- [ ] `npm install -D jest-axe @types/jest-axe` (user-approved).
- [ ] Update `frontend/src/test-setup.ts`: register `toHaveNoViolations`; ensure `matchMedia` stub supports `prefers-reduced-motion`.
- [ ] Add i18n keys to `en.json` + `es.json`: `errors.boundaryTitle`, `errors.boundaryMessage`, `errors.retry`, `errors.permissionDenied`, `common.loading`, `home.emptyRecent.headline`, `home.emptyRecent.subtext`, `explorer.a11y.tree`, `explorer.a11y.contents`, `explorer.a11y.insights`.

## Phase 1 — Tests (Red)

### Primitives
- [ ] `usePrefersReducedMotion.test.ts` — returns initial value; updates on `matchMedia` change.
- [ ] `EmptyState.test.tsx` — renders icon/headline/subtext; CTA fires onClick.
- [ ] `ErrorPanel.test.tsx` — renders title/message; fires `onRetry` when present; hides retry button when absent.
- [ ] `ErrorBoundary.test.tsx` — child throws → `<ErrorPanel>` shows; retry resets the boundary.
- [ ] `Skeleton.test.tsx` — renders with `aria-busy="true"` and `role="status"`.

### Interactions
- [ ] `useTreeKeyboardNav.test.ts` — ↑/↓/→/←/Enter/Home/End all behave per spec; `preventDefault` called only when focus is inside tree.
- [ ] Extend `FolderTree.test.tsx` — ARIA roles/attrs present; arrow-key nav moves focus between `treeitem`s.
- [ ] Extend `Explorer.test.tsx` — switching viewMode to "3d" shows `<Suspense>` fallback then the mocked graph; switching back crossfades.
- [ ] Extend `ContentsTable.test.tsx` — empty folder shows `<EmptyState>`; inaccessible folder shows `<ErrorPanel>` with `errors.permissionDenied`.
- [ ] Extend `InsightsPanel.test.tsx` — no focused node → `<EmptyState>`.
- [ ] Extend `Home.test.tsx` — no recent scans → `<EmptyState>`; scanError → `<ErrorPanel>` with retry.

### Accessibility
- [ ] `a11y.test.tsx` — `axe(<Home/>)` and `axe(<Explorer/>` with mocked scan) → zero violations (color-contrast disabled).

## Phase 2 — Implementation (Green)

### Workstream A — Primitives
- [ ] `hooks/usePrefersReducedMotion.ts`.
- [ ] `components/ui/EmptyState.tsx` — glass panel, icon + headline + subtext + optional CTA; motion-safe fade.
- [ ] `components/ui/ErrorPanel.tsx` — same visual family; red-tinted border.
- [ ] `components/ui/ErrorBoundary.tsx` — class component; `componentDidCatch` logs via `console.error`; renders `<ErrorPanel>`.
- [ ] `components/ui/Skeleton.tsx` — shimmer primitive.

### Workstream B — Bundle split
- [ ] `pages/Explorer.tsx`: `const Graph3DView = React.lazy(() => import("../components/explorer/graph3d/Graph3DView"))`; wrap in `<Suspense fallback={<Skeleton variant="graph"/>}>`.
- [ ] `vite.config.ts`: add `build.rollupOptions.output.manualChunks` mapping `three` + `react-force-graph-3d` → `graph3d` chunk.
- [ ] Verify mocked `react-force-graph-3d` still resolves through the dynamic import in tests.

### Workstream C — Empty + Error wiring
- [ ] Replace bare empty strings in `FolderTree`, `ContentsTable`, `InsightsPanel`, `Graph3DView`, `Home` (recent scans) with `<EmptyState>`.
- [ ] `ContentsTable`: when `focusedNode.accessible === false` → `<ErrorPanel>` with `errors.permissionDenied`.
- [ ] `Home`: when `scanError` is set → `<ErrorPanel>` with retry.
- [ ] `App.tsx`: wrap routes in `<ErrorBoundary>`.

### Workstream D — Animations
- [ ] `pages/Home.tsx`: stagger hero + recent-scans mount with Framer Motion.
- [ ] `pages/Explorer.tsx`: `<AnimatePresence mode="wait">` between columns and 3D view.
- [ ] Post-scan three-column staggered fade-in.
- [ ] Gate `AuroraBackground` animation on `usePrefersReducedMotion`.
- [ ] `globals.css`: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` (do not null out `transition` entirely — preserve focus-ring crispness).

### Workstream E — Accessibility
- [ ] `hooks/useTreeKeyboardNav.ts` implementation.
- [ ] `FolderTree`: attach hook; `role="tree"`; each item `role="treeitem"`, `aria-level`, `aria-expanded`, `tabIndex` roving (only focused item is `0`).
- [ ] `ContentsTable`: `role="table"`, `columnheader`s, `rowgroup`s.
- [ ] `TopMenuBar`: `aria-label` + `aria-pressed` on every icon-only toggle; keyboard shortcut hints via `title`.
- [ ] `globals.css`: universal `:focus-visible` ring using existing accent token.
- [ ] Add landmark roles: `<main>` wraps Explorer columns, `<nav>` wraps TopMenuBar.

## Phase 3 — Refactor
- [ ] Consolidate empty-state i18n keys into a single `common.empty.*` namespace if duplication emerges.
- [ ] Extract common animation variants (`fadeInUp`, `staggerChildren`) into `lib/motion.ts` if used in 3+ places.
- [ ] Ensure no `any` leaked into new code; run `npm run typecheck`.

## Phase 4 — Verify
- [ ] `npm run test` — all tests green.
- [ ] `npm run typecheck` — clean.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — confirm `graph3d` chunk split out; main Explorer chunk < 500 KB.

## Phase 5 — Manual QA
- [ ] `npm run dev` → load Explorer, Network tab → no Three.js fetched until 3D toggled.
- [ ] Keyboard-only walkthrough: Home → pick folder → scan → tree arrow-key nav → focus file → context menu → close.
- [ ] OS "reduce motion" → aurora static, no fades.
- [ ] Force a component throw (temp `throw new Error("test")`) → ErrorBoundary catches → retry works → remove temp throw.
- [ ] Light + dark mode visual pass on Home, Explorer (columns), Explorer (3D).
- [ ] Deliberately scan a permission-denied folder (e.g., `C:\System Volume Information`) → `ErrorPanel` with `errors.permissionDenied`.

## Phase 6 — Commit
- [ ] Single commit: `feat(m11): polish pass — lazy 3D, empty/error states, a11y, motion (see specs/m11-polish)`.
- [ ] Update `.claude/memory/current.md` with M11 completion + next milestone (M12 admin relaunch / advanced settings).
