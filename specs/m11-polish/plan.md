# Plan: M11 — Polish

## Architecture Overview
M11 is a breadth-first quality pass: no new features, no new routes, no backend work. Five workstreams, each independently shippable and each covered by tests where testable:
1. **Bundle split** — lazy-load `Graph3DView` + Three.js behind `React.lazy` / `Suspense` so the 1.34 MB chunk only loads when the user opens the 3D view.
2. **Empty states** — replace bare text strings in the three Explorer panels (and Home's recent-scans list) with composed empty-state components (icon + headline + subtext + optional CTA), animated in with Framer Motion.
3. **Error states** — add a top-level `ErrorBoundary`, a reusable `<ErrorPanel>` used by scan failures, and distinct UI for permission-denied / inaccessible folders surfaced in the tree and contents table.
4. **Animations** — purposeful micro-interactions: panel mount fades, view-mode switch crossfade, scan-progress → results transition, recent-scan hover lift. Every animation wrapped in `useReducedMotion` so it becomes a no-op when the OS requests it.
5. **Accessibility pass** — keyboard navigation on the folder tree (arrow keys, Enter, Home/End), focus-visible rings project-wide, ARIA labels on icon-only buttons, landmark roles on the three columns, axe-core audit in tests, dark/light contrast verified for data palettes.

## Files Affected

### Create
- `frontend/src/components/ui/EmptyState.tsx` — reusable `<EmptyState icon headline subtext cta? />`, glass-panel, motion-safe fade-in.
- `frontend/src/components/ui/ErrorPanel.tsx` — reusable `<ErrorPanel title message onRetry? />` used by ErrorBoundary and scan failures.
- `frontend/src/components/ui/ErrorBoundary.tsx` — class component catching render errors in `<App>`, shows `<ErrorPanel>` with reload CTA.
- `frontend/src/components/ui/Skeleton.tsx` — shimmer skeleton primitive for loading states in Tree / Contents / Insights during scan.
- `frontend/src/hooks/usePrefersReducedMotion.ts` — thin wrapper over `matchMedia("(prefers-reduced-motion: reduce)")`.
- `frontend/src/hooks/useTreeKeyboardNav.ts` — keyboard handler for folder tree (↑/↓ navigate, →/← expand/collapse, Enter focus, Home/End jump).
- `frontend/src/components/ui/__tests__/EmptyState.test.tsx`
- `frontend/src/components/ui/__tests__/ErrorBoundary.test.tsx`
- `frontend/src/components/ui/__tests__/ErrorPanel.test.tsx`
- `frontend/src/hooks/__tests__/usePrefersReducedMotion.test.ts`
- `frontend/src/hooks/__tests__/useTreeKeyboardNav.test.ts`
- `frontend/src/components/explorer/__tests__/a11y.test.tsx` — axe-core smoke pass over Explorer (columns view) and Home.
- `specs/m11-polish/spec.md` and `specs/m11-polish/tasks.md` (authored after plan approval).

### Modify
- `frontend/src/pages/Explorer.tsx` — wrap `<Graph3DView>` in `React.lazy` + `<Suspense fallback={<Skeleton variant="graph"/>}>`; crossfade between columns and 3D view using Framer's `AnimatePresence`.
- `frontend/src/pages/Home.tsx` — mount animations for hero + recent-scans list; use `<EmptyState>` when no recent scans; use `<ErrorPanel>` for `scanError`.
- `frontend/src/App.tsx` — wrap routes in `<ErrorBoundary>`.
- `frontend/src/components/explorer/columns/FolderTree.tsx` — attach `useTreeKeyboardNav`, add `role="tree"` / `role="treeitem"` / `aria-expanded` / `aria-level`, focus-visible ring; replace bare empty string with `<EmptyState>`.
- `frontend/src/components/explorer/columns/ContentsTable.tsx` — `<EmptyState>` for empty folder; `<ErrorPanel>` when `node.accessible === false`; ARIA `role="table"` / `columnheader`.
- `frontend/src/components/explorer/columns/InsightsPanel.tsx` — `<EmptyState>` when no focused node; ensure Recharts containers have `aria-label`.
- `frontend/src/components/explorer/graph3d/Graph3DView.tsx` — replace bare empty text with `<EmptyState>`; add `prefers-reduced-motion` → disable auto-rotate if we had any.
- `frontend/src/components/explorer/TopMenuBar.tsx` — `aria-label` on every icon-only button, `aria-pressed` on toggles, keyboard shortcut hints in `title`.
- `frontend/src/components/layout/Header.tsx` + `AuroraBackground.tsx` — gate the aurora animation on `usePrefersReducedMotion`.
- `frontend/src/styles/globals.css` — global `:focus-visible` ring; `@media (prefers-reduced-motion: reduce)` kill switch for `*` transitions.
- `frontend/src/i18n/en.json` + `es.json` — add `errors.boundaryTitle`, `errors.boundaryMessage`, `errors.retry`, `errors.permissionDenied`, `common.loading`, `home.emptyRecent.headline`, `home.emptyRecent.subtext`, `explorer.a11y.*` (labels for tree/table/columns).
- `frontend/vite.config.ts` — manualChunks hint: `three`, `react-force-graph-3d` → `graph3d` chunk (belt-and-suspenders with `React.lazy`).
- `frontend/src/test-setup.ts` — register `jest-axe` matcher; no-op `matchMedia` already stubbed; add if missing.
- `frontend/package.json` — **new dev dep**: `jest-axe` + `@types/jest-axe`. Requires approval (see Open Questions).

## Data Model Changes
None. Pure frontend polish.

## API Surface
None. No backend changes.

## Testing Strategy

**TDD-first for every new component and hook.**

### Unit / Component (Vitest + RTL)
- `EmptyState.test.tsx` — renders icon/headline/subtext; CTA click fires; respects `prefers-reduced-motion` (no motion assertions beyond presence).
- `ErrorBoundary.test.tsx` — child throws → shows `<ErrorPanel>`; retry button resets error.
- `ErrorPanel.test.tsx` — renders title/message; calls `onRetry` when provided and clicked.
- `usePrefersReducedMotion.test.ts` — returns true when `matchMedia` reports reduce; updates on change event.
- `useTreeKeyboardNav.test.ts` — ↑/↓ moves focus; → expands collapsed; ← collapses or moves to parent; Enter calls `onActivate`; Home/End jump to first/last.
- Extend `FolderTree.test.tsx` — keyboard nav integration; ARIA attrs present.
- Extend `Explorer.test.tsx` — lazy Graph3D renders a suspense fallback then resolves; `AnimatePresence` transition does not break focus.

### Accessibility (jest-axe)
- `a11y.test.tsx` — renders `<Home>` and `<Explorer>` (columns view, with mocked scan result) and asserts `expect(await axe(container)).toHaveNoViolations()`. Ignores rules that jsdom can't evaluate (e.g., color-contrast where computed styles are unavailable — fall back to manual check).

### Manual verification (documented in tasks.md)
- `npm run build` → confirm `graph3d` chunk is separate and main chunk shrinks below ~500 KB.
- DevTools Network tab: loading `/explorer` does **not** fetch the Three.js chunk until view is switched to 3D.
- Windows high-contrast mode: UI remains legible.
- Keyboard-only walkthrough: Home → pick folder → scan → navigate tree → focus a file → open context menu → close — all without mouse.
- Screen reader pass (NVDA) on Home and Explorer — landmark navigation works.
- Toggle OS "reduce motion" → verify aurora + mount animations disable.
- Throw a deliberate error in a component → ErrorBoundary catches and offers retry.

### Not covered automatically
- Real color-contrast (jsdom has no computed styles). Manual Lighthouse / axe DevTools run.
- Animation timing fidelity. Rely on `prefers-reduced-motion` contract.
- Bundle-size regression. Manual `npm run build` output inspection (could add a CI check later, out of scope).

## Risks & Mitigations
- **Risk:** `React.lazy` around `<Graph3DView>` breaks existing `Explorer.test.tsx` because the mocked `react-force-graph-3d` is now loaded asynchronously.
  **Mitigation:** Use `findByTestId` / `await` in tests; confirm test-setup's mock survives the dynamic import.
- **Risk:** `AnimatePresence` crossfade between columns and 3D leaves both mounted during transition, briefly doubling memory / firing extra network.
  **Mitigation:** Use `mode="wait"` so exit animation completes before enter starts.
- **Risk:** Adding `jest-axe` is a new dep (CLAUDE.md §7.5 requires approval).
  **Mitigation:** **Stop and ask user** before installing. Fallback: skip the axe test and rely purely on manual audit.
- **Risk:** Empty-state CTAs pull focus unexpectedly and disrupt screen-reader flow.
  **Mitigation:** CTAs are opt-in per instance; never `autoFocus`; rely on natural tab order.
- **Risk:** Global `prefers-reduced-motion` override in `globals.css` (`* { transition: none !important }`) is too heavy-handed and kills useful affordances like focus-ring fades.
  **Mitigation:** Scope the kill switch to `animation` and `transition-duration: 0.01ms`, not full `transition: none`; keep focus rings instant but visible.
- **Risk:** Keyboard tree nav conflicts with browser default scrolling on ↑/↓.
  **Mitigation:** `preventDefault()` only when focus is inside the tree; test both inside and outside cases.
- **Risk:** Light-mode contrast on data palette (Recharts pie + graph3d spheres) may fail WCAG AA.
  **Mitigation:** Manual contrast check in tasks.md; if failing, swap to darker sequential palette in light mode. This is a bounded change, not a redesign.
- **Risk:** Lucide-react `icon not found` error (prior lesson) when picking new empty-state icons.
  **Mitigation:** Verify each icon exists before committing; check `lessons/lucide-react-icon-existence.md`.

## Rollback Plan
Five independent commits on `main`, one per workstream:
1. `perf(frontend): lazy-load Graph3DView bundle`
2. `feat(ui): reusable EmptyState and ErrorPanel components`
3. `feat(frontend): ErrorBoundary + skeleton loading states`
4. `feat(frontend): motion-safe animations across Home and Explorer`
5. `feat(a11y): keyboard navigation, ARIA, focus rings`

Each commit is independently revertible via `git revert <sha>`. No DB migrations, no API contract changes. Worst case, revert the whole milestone — the app returns to post-M10 state.

## Open Questions (require user decision before I proceed)
1. **Approve adding `jest-axe` + `@types/jest-axe` (dev deps)?** Small, widely used, dev-only. Alternative: skip axe automation and rely on manual audit.
2. **Scope confirmation.** Strictly the five workstreams above? Or include anything else (toast system, confirmation dialogs re-skin, virtualized 3D graph search, onboarding tour)? Recommend: strict scope; defer extras to a future M12+.
3. **Commit cadence.** Five focused commits as listed, or one big `feat(m11): polish pass`? Recommend: five — easier to review and revert.
4. **Also produce `spec.md` + `tasks.md` now**, or review this plan first and I'll expand after approval? Recommend: plan first, approval, then spec + tasks.
