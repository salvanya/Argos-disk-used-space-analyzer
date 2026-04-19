# Tasks: M13 — UX Refinements

> Six phases, each shipped as its own conventional commit. TDD discipline per CLAUDE.md §6.2 — every phase starts with a failing test.

## Phase A — Footer (`feat(m13): attribution footer on Home and Explorer`)
- [ ] Write `Footer.test.tsx` (renders `Argos`, `Leandro Salvañá`, `MIT License`, the translated `footer.createdBy` phrase) — expect **red**.
- [ ] Create `frontend/src/components/layout/Footer.tsx`.
- [ ] Add `footer.createdBy` to `en.json` (`"created by"`) and `es.json` (`"creado por"`).
- [ ] Mount `<Footer />` at the bottom of `Home.tsx` and `Explorer.tsx`.
- [ ] Run `npm run test -- --run src/components/layout` — expect **green**.
- [ ] Run `npm run lint && npm run typecheck` — clean.
- [ ] Commit.

## Phase B — Toolbar order (`refactor(m13): group-by precedes sort controls in contents toolbar`)
- [ ] Update `ContentsTable.test.tsx` to assert group-by control is the leftmost toolbar element — expect **red**.
- [ ] Re-order JSX in `ContentsTable.tsx` so group-by `<select>` comes before Name/Size sort buttons.
- [ ] Run tests — expect **green**.
- [ ] Commit.

## Phase C — Default sort (`feat(m13): default middle-column sort to size desc`)
- [ ] Add test to `ContentsTable.test.tsx`: fresh mount with multi-size children renders size-desc order without clicks — expect **red**.
- [ ] Initialise `sortKey` to `"size"` and `sortDir` to `"desc"` in `ContentsTable.tsx`.
- [ ] Add test: intra-session stickiness on sibling navigation (state survives focusedPath change since component doesn't remount) — expect **green**.
- [ ] Add test: unmount/remount resets to size-desc — expect **green**.
- [ ] Commit.

## Phase D — Dark-mode dropdown fix (`feat(m13): readable group-by dropdown via custom popover`)
- [ ] Write `GroupBySelect.test.tsx` (button renders, popover opens, options click, keyboard nav, ARIA roles) — expect **red**.
- [ ] Create `frontend/src/components/ui/GroupBySelect.tsx` (button trigger + popover list using existing glass/bg-modal tokens; combobox/listbox ARIA).
- [ ] Replace native `<select>` in `ContentsTable.tsx` with `<GroupBySelect>`.
- [ ] Update `ContentsTable.test.tsx` to drive the new component (click trigger → click option).
- [ ] Commit.

## Phase E — 3D sphere sizing (`fix(m13): 3D sphere radius proportional to size`)
- [ ] Audit `graphData.test.ts` for exact-value assertions; rewrite to monotonicity/clamping/ratio form.
- [ ] Add assertion in `Graph3DView.test.tsx`: `nodeVal` prop passed to the mocked `ForceGraph3D` equals `radius ** 3` for a sample node — expect **red**.
- [ ] Change `Graph3DView.tsx`: `nodeVal={(n) => n.radius ** 3}`.
- [ ] Visually verify on a small scan: 1 GB folder sphere noticeably larger than 1 KB file; 0-byte sphere still visible. Tune `MIN_RADIUS` / `MAX_RADIUS` / log coefficient in `graphData.ts` if needed.
- [ ] Run tests — expect **green**.
- [ ] Commit.

## Phase F — Resizable columns (`feat(m13): resizable Explorer columns with localStorage persistence`)
- [ ] Write `columnWidthsStore.test.ts` (defaults, setWidth, persistence, clampToViewport, min-snap on init) — expect **red**.
- [ ] Create `frontend/src/stores/columnWidthsStore.ts`.
- [ ] Write `ResizeHandle.test.tsx` (role=separator, mouse-drag → onChange, keyboard ±16 px, ARIA values) — expect **red**.
- [ ] Create `frontend/src/components/explorer/columns/ResizeHandle.tsx`.
- [ ] Update `Explorer.test.tsx`: assert two handles present; persisted widths applied as inline style — expect **red**.
- [ ] Refactor `ColumnsLayout` in `Explorer.tsx` to consume the store, render two `<ResizeHandle>` between panels, use controlled `style={{ width }}`.
- [ ] Run all tests + manual drag verification.
- [ ] Commit.

## Closing
- [ ] Update `.claude/memory/current.md` — mark M13 done; next step is M14 (user still owes flavor pick).
- [ ] Archive the prior `current.md` under `.claude/memory/archive/`.
- [ ] Final `pytest` + `npm run test -- --run` + `ruff check .` + `mypy backend/core` to confirm no cross-regressions.
