# Tasks: M13 — UX Refinements

> Six phases, each shipped as its own conventional commit. TDD discipline per CLAUDE.md §6.2 — every phase starts with a failing test.

## Phase A — Footer (`feat(m13): attribution footer on Home and Explorer`)
- [x] Write `Footer.test.tsx` (renders `Argos`, `Leandro Salvañá`, `MIT License`, the translated `footer.createdBy` phrase) — expect **red**.
- [x] Create `frontend/src/components/layout/Footer.tsx`.
- [x] Add `footer.createdBy` to `en.json` (`"created by"`) and `es.json` (`"creado por"`).
- [x] Mount `<Footer />` at the bottom of `Home.tsx` and `Explorer.tsx`.
- [x] Run `npm run test -- --run src/components/layout` — expect **green**.
- [x] Run `npm run lint && npm run typecheck` — clean.
- [x] Commit.

## Phase B — Toolbar order (`refactor(m13): group-by precedes sort controls in contents toolbar`)
- [x] Update `ContentsTable.test.tsx` to assert group-by control is the leftmost toolbar element — expect **red**.
- [x] Re-order JSX in `ContentsTable.tsx` so group-by `<select>` comes before Name/Size sort buttons.
- [x] Run tests — expect **green**.
- [x] Commit.

## Phase C — Default sort (`feat(m13): default middle-column sort to size desc`)
- [x] Add test to `ContentsTable.test.tsx`: fresh mount with multi-size children renders size-desc order without clicks — expect **red**.
- [x] Initialise `sortKey` to `"size"` and `sortDir` to `"desc"` in `ContentsTable.tsx`.
- [x] Add test: intra-session stickiness on sibling navigation (state survives focusedPath change since component doesn't remount) — expect **green**.
- [x] Add test: unmount/remount resets to size-desc — expect **green**.
- [x] Commit.

## Phase D — Dark-mode dropdown fix (`feat(m13): readable group-by dropdown via custom popover`)
- [x] Write `GroupBySelect.test.tsx` (button renders, popover opens, options click, keyboard nav, ARIA roles) — expect **red**.
- [x] Create `frontend/src/components/ui/GroupBySelect.tsx` (button trigger + popover list using existing glass/bg-modal tokens; combobox/listbox ARIA).
- [x] Replace native `<select>` in `ContentsTable.tsx` with `<GroupBySelect>`.
- [x] Update `ContentsTable.test.tsx` to drive the new component (click trigger → click option).
- [x] Commit.

## Phase E — 3D sphere sizing (`fix(m13): 3D sphere radius proportional to size`)
- [x] Audit `graphData.test.ts` for exact-value assertions; rewrite to monotonicity/clamping/ratio form.
- [x] Add assertion in `Graph3DView.test.tsx`: `nodeVal` prop passed to the mocked `ForceGraph3D` equals `radius ** 3` for a sample node — expect **red**.
- [x] Change `Graph3DView.tsx`: `nodeVal={(n) => n.radius ** 3}`.
- [x] Visually verify on a small scan: 1 GB folder sphere noticeably larger than 1 KB file; 0-byte sphere still visible. Tune `MIN_RADIUS` / `MAX_RADIUS` / log coefficient in `graphData.ts` if needed.
- [x] Run tests — expect **green**.
- [x] Commit.

## Phase F — Resizable columns (`feat(m13): resizable Explorer columns with localStorage persistence`)
- [x] Write `columnWidthsStore.test.ts` (defaults, setWidth, persistence, clampToViewport, min-snap on init) — expect **red**.
- [x] Create `frontend/src/stores/columnWidthsStore.ts`.
- [x] Write `ResizeHandle.test.tsx` (role=separator, mouse-drag → onChange, keyboard ±16 px, ARIA values) — expect **red**.
- [x] Create `frontend/src/components/explorer/columns/ResizeHandle.tsx`.
- [x] Update `Explorer.test.tsx`: assert two handles present; persisted widths applied as inline style — expect **red**.
- [x] Refactor `ColumnsLayout` in `Explorer.tsx` to consume the store, render two `<ResizeHandle>` between panels, use controlled `style={{ width }}`.
- [x] Run all tests + manual drag verification.
- [x] Commit.

## Closing
- [x] Update `.claude/memory/current.md` — mark M13 done; next step is M14 (user still owes flavor pick).
- [x] Archive the prior `current.md` under `.claude/memory/archive/`.
- [x] Final `pytest` + `npm run test -- --run` + `ruff check .` + `mypy backend/core` to confirm no cross-regressions.
