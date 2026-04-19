# Plan: M13 — UX Refinements

> Companion to `specs/m13-ux-refinements/spec.md`. All five open-question defaults are approved: (1) sort resets only on app reload; (2) invisible-until-hover resize handles; (3) footer on every screen; (4) dark-mode dropdown fix scoped to the one broken component; (5) 3D sphere constants tuned visually during implementation.

## Architecture Overview

Six independent UX fixes are bundled into one milestone because they share zero interdependencies and land in the frontend only. No backend touch. Each fix is small enough to ship as its own conventional commit; the ordering below sorts smallest-blast-radius first so a mid-milestone revert touches at most one piece. All work lives under `frontend/src/`; the Python backend, API, data model, and cache are untouched.

## Files Affected

### New files
- `frontend/src/components/layout/Footer.tsx` — attribution footer rendered on Home and Explorer.
- `frontend/src/components/ui/GroupBySelect.tsx` — custom replacement for the native `<select>` used by the middle-column group-by control; uses a button + popover list so dark-mode renders correctly.
- `frontend/src/components/explorer/columns/ResizeHandle.tsx` — 4 px invisible-until-hover drag handle with keyboard support (ArrowLeft / ArrowRight = 16 px steps).
- `frontend/src/stores/columnWidthsStore.ts` — zustand slice holding `{ tree, middle, insights }` widths in pixels; persists to `localStorage` under `argos-column-widths`; exposes `setWidth`, `clampToViewport`.
- Tests (all mirror existing `__tests__/` layout):
  - `frontend/src/components/layout/__tests__/Footer.test.tsx`
  - `frontend/src/components/ui/__tests__/GroupBySelect.test.tsx`
  - `frontend/src/components/explorer/columns/__tests__/ResizeHandle.test.tsx`
  - `frontend/src/stores/__tests__/columnWidthsStore.test.ts`

### Modified files
- `frontend/src/pages/Home.tsx` — append `<Footer />` below `<main>`.
- `frontend/src/pages/Explorer.tsx` — append `<Footer />` below the view area; swap `ColumnsLayout`'s hard-coded Tailwind widths for controlled `style={{ width: <px> }}` driven by `columnWidthsStore`; insert two `<ResizeHandle>` between panels.
- `frontend/src/components/explorer/columns/contents/ContentsTable.tsx`
  - **Default sort**: initialise `useState<SortKey | null>("size")` and `useState<SortDir>("desc")` instead of `null`/`"asc"`.
  - **Toolbar order**: move the `<select>` (now `<GroupBySelect>`) from mid-row to the leftmost position; Name/Size sort-toggle buttons stay as the sort controls, now on the right of the group-by.
  - Replace the native `<select>` element with the new `<GroupBySelect>` component (props: `value`, `onChange`, `options`).
- `frontend/src/components/explorer/graph3d/Graph3DView.tsx` — change `nodeVal={(n) => n.radius}` to `nodeVal={(n) => n.radius ** 3}` so the force-graph library's internal `cbrt` recovers the log-scaled radius (see **Data Model Changes** below for rationale).
- `frontend/src/components/explorer/graph3d/graphData.ts`
  - Re-tune `MIN_RADIUS` / `MAX_RADIUS` constants and the `Math.log10(size + 1) * 2.5` coefficient **visually** during implementation; no algorithmic change. Acceptance is qualitative (1 GB sphere dramatically larger than 1 KB; zero-byte still visible).
- `frontend/src/i18n/en.json` — add `footer.createdBy: "created by"`.
- `frontend/src/i18n/es.json` — add `footer.createdBy: "creado por"`.
- `frontend/src/components/explorer/graph3d/__tests__/graphData.test.ts` — update expectations if re-tuned constants change returned radius ranges (test asserts monotonicity, min/max clamping, zero handling — all still hold).
- `frontend/src/components/explorer/columns/contents/__tests__/ContentsTable.test.tsx` — update default-sort test + toolbar-order assertions.
- `frontend/src/pages/__tests__/Explorer.test.tsx` — if it asserts hard-coded layout widths, loosen to assert presence of resize handles + footer.
- `frontend/src/components/layout/__tests__/Header.test.tsx` — no change expected; flagged for awareness.

## Data Model Changes

### New TypeScript types
```ts
// columnWidthsStore.ts
interface ColumnWidths {
  tree: number;     // pixels
  middle: number;   // pixels
  insights: number; // pixels
}
interface ColumnWidthsState {
  widths: ColumnWidths;
  setWidth: (col: keyof ColumnWidths, px: number) => void;
  clampToViewport: (viewportWidth: number) => void;
  resetToDefaults: () => void;
}
```

### Constraints
- `tree ≥ 200 px`, `middle ≥ 280 px`, `insights ≥ 240 px`.
- No panel > 70 % of current viewport width.
- Defaults (first mount, no persisted value): tree 22 %, middle 48 %, insights 30 % of available width — matches today's `w-60 / flex-1 / w-80` feel at a 1440-wide viewport.
- Persistence key: `argos-column-widths`. JSON `{ tree: number, middle: number, insights: number }`. Reads on store init; writes on every `setWidth` call.

### Sort state
- `ContentsTable` already holds `sortKey` / `sortDir` in React state. **No change to storage** — sort persistence boundary is intentionally the component lifecycle (which equals the session, because Explorer unmounts/remounts on reload). No `localStorage`, no zustand.

### 3D radius contract
- `nodeRadius(size)` continues to return a displayed-radius value (log-scaled). This is a **logical** radius in graph units.
- `Graph3DView` consumes it as `nodeVal = radius ** 3` because `react-force-graph-3d` treats `nodeVal` as sphere volume and renders `radius_displayed = cbrt(nodeVal) * nodeRelSize`. Today's code passes `nodeVal = radius` which collapses the range `[2, 40]` → rendered radii `[1.26, 3.42]` — imperceptibly similar. Cubing restores the log-scaled range.
- Unit-test contract on `nodeRadius` is unchanged (monotonic, clamped, `size=0 → MIN_RADIUS`); a small new assertion will cover the `nodeVal = radius³` mapping at the `Graph3DView` level.

## API Surface

None. No backend endpoints added, modified, or removed. No change to the scan/cache/settings/websocket contracts.

## Testing Strategy

TDD per CLAUDE.md §6.2. Each phase writes its failing test(s) first. Frontend tests use Vitest + React Testing Library (project already configured).

### Phase A — Footer
- **Unit/component** (`Footer.test.tsx`):
  1. Renders literal string `Argos` and `Leandro Salvañá` (not translated).
  2. Renders `MIT License` literal.
  3. Renders the translated `footer.createdBy` phrase in EN and ES (two render cases with `<I18nextProvider>` switching locales).
- **i18n parity**: existing parity test picks up the new key automatically (it asserts every key in `en.json` exists in `es.json`).

### Phase B — Toolbar order in ContentsTable
- Extend `ContentsTable.test.tsx`:
  1. `getAllByRole("button")`/DOM order — group-by control precedes name-sort button in source order.
  2. Assert no new buttons/selects introduced (length of toolbar controls unchanged = 3: group-by, name, size).

### Phase C — Default sort
- Extend `ContentsTable.test.tsx`:
  1. On fresh mount with a focused folder that has children of varied sizes, rendered rows are ordered size-desc without user clicks.
  2. After clicking Name-asc and navigating to a sibling folder (simulate focusedPath change), rows remain sorted by Name-asc (intra-session stickiness — which falls out for free from component state).
  3. Unmount / remount (simulating reload) → state resets to size-desc.

### Phase D — GroupBySelect dark-mode fix
- `GroupBySelect.test.tsx`:
  1. Renders a button with the current value's label.
  2. Opens a popover on click showing all options.
  3. Clicking an option fires `onChange` with the option's value and closes the popover.
  4. Options are `role="option"` and the listbox is `role="listbox"` (a11y).
  5. Keyboard: ArrowDown / ArrowUp cycles focus, Enter selects, Escape closes.
  6. Dark-mode rendering: open popover has a class or inline style using the neutral-gray token (e.g., `bg-[var(--bg-modal)]` or the `glass` utility) — snapshot against a `class="dark"` wrapper to assert no `bg-white` / no unstyled native-option fallback.
- `ContentsTable.test.tsx` updated to match the new component API (trigger + option click instead of `<select>` change event).

### Phase E — 3D sphere sizing
- Extend `graphData.test.ts`:
  1. `nodeRadius(0) === MIN_RADIUS` (already covered; re-assert after any constant tuning).
  2. `nodeRadius(1_000_000_000) > nodeRadius(1_000)` by a visually significant margin (e.g., `diff > 10` in graph units).
  3. Radii clamp: `nodeRadius(Number.MAX_SAFE_INTEGER) === MAX_RADIUS`.
- New assertion at the `Graph3DView` layer (component test or a thin unit helper): when a node has `radius = r`, the `nodeVal` function it hands to `ForceGraph3D` returns `r ** 3`. Mock `react-force-graph-3d` (already mocked in existing tests — reuse the pattern from `Graph3DView.test.tsx`) and inspect the `nodeVal` prop.

### Phase F — Resizable columns
- `columnWidthsStore.test.ts`:
  1. Defaults are applied when `localStorage` is empty.
  2. `setWidth` writes through to `localStorage` as JSON.
  3. `clampToViewport(800)` shrinks proportionally while honouring per-panel mins.
  4. Reading a value below a panel's min from `localStorage` snaps to the min on init.
- `ResizeHandle.test.tsx`:
  1. Renders with `role="separator"`, `aria-orientation="vertical"`, `aria-valuenow`/`aria-valuemin`/`aria-valuemax`.
  2. Mouse: mousedown → mousemove → mouseup fires `onChange` with final delta.
  3. Keyboard: ArrowLeft / ArrowRight fire `onChange` with ±16 px.
- Integration (`Explorer.test.tsx`):
  1. Two resize handles are present between the three panels.
  2. Panel widths from the store are applied as inline `style.width`.
  3. After a drag simulation, the store's values change and `localStorage` is written.

### Manual verification (end-of-milestone)
- Run `python main.py`, launch browser; scan a small fixture folder.
- Drag both handles, reload, confirm persistence.
- Change sort to name-asc, navigate siblings, confirm stickiness; reload, confirm reset to size-desc.
- Toggle theme → dark; open group-by dropdown; confirm options are readable.
- Verify footer renders on Home and Explorer.
- Switch to 3D view; confirm clear size differences between heavy folders and small files; hover still shows tooltip.

### Quality gates (before final commit)
- `cd frontend && npm run lint && npm run typecheck && npm run test -- --run` (or equivalent; follow existing package.json scripts).
- `pytest` — confirm backend suite still passes (nothing changed there, but the guard is cheap).
- `ruff check .` + `mypy backend/core` — no regressions.
- i18n parity test green.

## Risks & Mitigations

- **Risk — Resize handle breaks flex/grid layout of child panels.**
  Mitigation: keep the container `flex`; switch children from `flex-1`/`w-60` to inline `style.width` with `flex-shrink: 0`; the old `min-w-0` on the contents panel is retained for inner virtualization to keep working. Add explicit `overflow-hidden` where needed.

- **Risk — `localStorage` persistence flashes default widths before rehydrating (FOUC).**
  Mitigation: read once during module init (synchronous), pass initial state into zustand `create` — no React-effect delay. Matches how `settingsStore` already hydrates.

- **Risk — Native `<select>` replacement loses accessibility for screen-reader users.**
  Mitigation: implement `GroupBySelect` as a proper `role="combobox"` + `role="listbox"` pattern (aria-expanded, aria-activedescendant, keyboard navigation). Reference WAI-ARIA authoring practices. Cover in unit tests (Phase D keyboard + role assertions).

- **Risk — Changing `nodeVal` visually tanks the layout/spacing of the force graph because heavier nodes now repel harder.**
  Mitigation: `react-force-graph-3d` uses `nodeVal` mainly for the sphere mesh radius; collision/charge forces use their own separately-configurable params. Confirm by visual inspection; if collisions explode, clamp via `nodeRelSize` tune rather than re-flattening radii. Test in 3D view against a medium fixture (tens of nodes) before committing.

- **Risk — Re-tuning sphere constants breaks `graphData.test.ts` assertions that encode the current numeric outputs.**
  Mitigation: audit `graphData.test.ts` up front; prefer monotonic / clamp-based assertions over exact-value assertions. Any exact-value assertion that blocks re-tuning gets rewritten to a range/ratio assertion in Phase E's red step.

- **Risk — Footer covers in-app content on small viewports or conflicts with the 3D graph's absolute-positioned legend.**
  Mitigation: make the footer `position: static` (not fixed) and let it participate in normal flow below the main area. On Explorer, the main area is `flex min-h-0 flex-1 overflow-hidden` today — keep it so the footer sits below the scroll-clipping region. Cap footer height at 40 px per spec.

- **Risk — Default-sort change surprises anyone who had internalised the current "as-scanned" order.**
  Mitigation: this is explicitly the spec's desired behaviour (User Story 3). No mitigation needed beyond documenting it in the commit.

- **Risk — Scope creep from "while we're in there" fixes to neighbouring components.**
  Mitigation: if another dropdown exhibits the same dark-mode bug, add a `// TODO(m13-followup)` comment and file the observation in `.claude/memory/current.md` for the next session; do not fix in this milestone (per spec open-question 4).

## Rollback Plan

Each phase ships as its own conventional commit (ordered A → F). To roll back any single fix, `git revert <sha>` of that commit restores prior behaviour without affecting sibling fixes; none of the six items share files beyond:
- `ContentsTable.tsx` — edited in Phase B, C, D. Rollback order: D → C → B.
- `Explorer.tsx` — edited in Phase A (footer mount point) and Phase F (resizable columns). Rollback Phase F first.
- `graphData.ts` / `Graph3DView.tsx` — edited only in Phase E.

Full-milestone rollback: `git revert beddb35..HEAD` on `main`. No DB migrations, no cache invalidation needed (backend untouched).

## Implementation Ordering (ship as six commits)

1. **Phase A — Footer** (`feat(m13): attribution footer on Home and Explorer`).
2. **Phase B — Toolbar order** (`refactor(m13): group-by precedes sort controls in contents toolbar`).
3. **Phase C — Default sort** (`feat(m13): default middle-column sort to size desc`).
4. **Phase D — Dark-mode dropdown fix** (`feat(m13): readable group-by dropdown via custom popover`).
5. **Phase E — 3D sphere sizing** (`fix(m13): 3D sphere radius proportional to size (nodeVal = r³)`).
6. **Phase F — Resizable columns** (`feat(m13): resizable Explorer columns with localStorage persistence`).

Each commit runs the relevant tests + lint/typecheck before landing. After Phase F, update `.claude/memory/current.md` to mark M13 done and leave M14 flavor question open.

## Tasks file
To be generated as `specs/m13-ux-refinements/tasks.md` after this plan is approved.
