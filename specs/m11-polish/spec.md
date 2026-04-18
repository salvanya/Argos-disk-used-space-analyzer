# Spec: M11 — Polish

## Problem
The core feature set (M0–M10) is functional but rough. The app ships a 1.34 MB Three.js chunk to every visitor even when they never open the 3D view; empty and error states are bare untranslated placeholder strings; there are no loading skeletons during long scans; the folder tree cannot be operated without a mouse; icon-only buttons lack accessible names; motion plays unconditionally regardless of OS accessibility preferences. The app is a competent engineering demo but not yet the "calm, precise, luxurious" product CLAUDE.md §5 calls for.

## Goals
- Initial Explorer page load fetches < 500 KB of JS; Three.js + `react-force-graph-3d` loaded only when the user switches to 3D view.
- Every empty surface (no scan, empty folder, no insights, no recent scans, no focused node) renders a composed empty-state with icon + headline + subtext, not a stray string.
- Every error path (render crash, scan failure, permission denied, inaccessible folder) renders a composed error panel with a clear message and, where applicable, a retry action.
- The app is fully keyboard-operable: tab order is sensible, the folder tree responds to arrow keys / Enter / Home / End, focus-visible rings are universal.
- `prefers-reduced-motion` is respected: aurora background and all non-essential transitions become instant.
- Automated accessibility smoke pass (jest-axe) reports zero violations on Home and Explorer (columns view).

## Non-Goals
- No new features (no toast system, no onboarding tour, no command palette, no 3D graph search).
- No visual redesign, new color tokens, or new typography choices.
- No backend changes, new API endpoints, or data-model changes.
- No CI / bundle-size regression automation (manual verification is enough for this milestone).
- No full WCAG AA color-contrast audit of every surface; manual spot-check only.
- No screen-reader-specific announcements (e.g., live regions) beyond what RTL + jest-axe will catch.

## User Stories
- As a first-time user, I want the app to load quickly even on a slow connection, so that I do not wait on a Three.js bundle I may never use.
- As a keyboard user, I want to navigate the folder tree with arrow keys, so that I can operate the app without a mouse.
- As a user with vestibular sensitivity, I want motion to disable when my OS reports "reduce motion," so that the UI is comfortable for me.
- As a user whose scan crashed on a permission-denied folder, I want a clear explanation and a retry affordance, so that I know what went wrong and what to do next.
- As any user, I want empty panels to look intentional rather than broken, so that I trust the app's state.

## Acceptance Criteria

**Bundle split**
- Given a fresh browser session, When I load `/explorer` without ever opening the 3D view, Then the network tab shows no request for a `three` / `react-force-graph-3d` chunk.
- Given I am on `/explorer`, When I toggle view mode to "3D," Then the 3D chunk is fetched and the view renders after a `<Suspense>` fallback.
- Given `npm run build`, Then the main Explorer chunk is under 500 KB and a separate `graph3d*` chunk contains Three.js.

**Empty states**
- Given no recent scans exist on Home, Then an `<EmptyState>` renders with an icon, headline, and subtext using `home.emptyRecent.*` keys.
- Given the Explorer is mounted before a scan completes (or `result` is null), Then each of the three columns renders an `<EmptyState>` with the existing `explorer.empty*` strings.
- Given the focused folder is empty, Then the Contents table renders an `<EmptyState>` (not a zero-row table).
- Given no node is focused, Then the Insights panel renders an `<EmptyState>`.
- Given 3D view mode is active but no scan result exists, Then `<Graph3DView>` renders an `<EmptyState>` using `graph3d.emptyState`.

**Error states**
- Given a child component throws during render, When React catches the error, Then `<ErrorBoundary>` renders `<ErrorPanel>` with a translated title, message, and a "retry" CTA that remounts the tree.
- Given a scan fails, Then Home renders an `<ErrorPanel>` using the existing `home.scanError` message and a retry button that re-triggers the scan.
- Given a folder node has `accessible === false`, Then the Contents table shows an `<ErrorPanel>` with `errors.permissionDenied` in place of rows.

**Animations & reduced motion**
- Given `prefers-reduced-motion: reduce`, Then the aurora background does not animate, no panel mount fade plays, and `transition` durations on all elements are ≤ 10 ms.
- Given `prefers-reduced-motion: no-preference`, When I switch view modes, Then the columns and 3D views crossfade via `AnimatePresence mode="wait"`.
- Given a scan completes, When results arrive, Then the three Explorer columns fade in in a staggered sequence (≤ 400 ms total).

**Accessibility**
- Given focus is on a `treeitem` in the folder tree, When I press ↓, Then focus moves to the next visible node; ↑ moves to previous; → expands a collapsed node or moves to first child; ← collapses or moves to parent; Enter activates (focuses) the node; Home/End jump to first/last visible node.
- Given any interactive element receives keyboard focus, Then a visible focus ring renders (via `:focus-visible`).
- Given any icon-only button, Then it has an `aria-label` derived from its i18n key.
- Given the folder tree and contents table, Then they expose `role="tree"` / `role="table"` with correct `role="treeitem"` / `aria-level` / `aria-expanded` / `columnheader` children.
- Given `axe(container)` runs on Home and Explorer (columns view), Then it reports zero violations (with `color-contrast` rule disabled — verified manually).

## Open Questions
All resolved:
- jest-axe: approved.
- Scope: strict five workstreams.
- Commit cadence: one big `feat(m11): polish pass` commit.
- Spec + tasks: authored together with plan.
