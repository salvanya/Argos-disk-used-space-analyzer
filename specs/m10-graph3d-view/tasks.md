# Tasks: M10 — 3D Graph View

## Phase 0 — Setup
- [ ] `npm install react-force-graph-3d three` and `npm install -D @types/three` in `frontend/`.
- [ ] Add `react-force-graph-3d` stub to `frontend/src/test-setup.ts` (export a `<ForceGraph3D>` that renders a plain `<div>` and records props on a ref for test assertions).
- [ ] Verify `npm run test` still passes after stub.

## Phase 1 — Tests (Red)

### Pure helpers — `components/explorer/__tests__/graphData.test.ts`
- [ ] `flattenTreeToGraph`: 3-level tree → N nodes, N-1 links, stable ids.
- [ ] `flattenTreeToGraph`: symlink children are NOT recursed.
- [ ] `flattenTreeToGraph`: inaccessible nodes get `kind: "inaccessible"`.
- [ ] `flattenTreeToGraph`: when node count > 5000, deepest leaves are aggregated and emitted count ≤ 5000 + notice flag true.
- [ ] `nodeRadius`: size 0 → min clamp (2); size X < Y → radius(X) ≤ radius(Y); huge sizes capped at max clamp (40).
- [ ] `nodeColor`: returns distinct values for folder / file / symlink / inaccessible; switches palette on theme param.

### Component — `components/explorer/__tests__/Graph3DView.test.tsx`
- [ ] Renders (mocked) `<ForceGraph3D>` with derived graph data when `scanStore.result` is present.
- [ ] Shows empty state when `result` is null.
- [ ] Clicking a node (via mocked `onNodeClick`) calls `explorerStore.setFocusedPath(path)`.
- [ ] Legend renders translated keys (`graph3d.legend.folder`, `…file`, `…symlink`, `…inaccessible`).
- [ ] Downsampled notice appears iff node count > 5000.

### Integration — extend `pages/__tests__/Explorer.test.tsx` (or new file)
- [ ] `viewMode === "3d"` renders `<Graph3DView>`, not the three-column grid; `<TopMenuBar>` stays mounted.
- [ ] `viewMode === "columns"` (default) preserves existing behavior — snapshot or presence assertion.

## Phase 2 — Implementation (Green)
- [ ] `components/explorer/graph3d/graphData.ts` — `flattenTreeToGraph`, `nodeRadius`, `nodeColor`, `GraphNode`/`GraphLink`/`GraphData` types.
- [ ] `components/explorer/graph3d/NodeTooltip.tsx` — small glass panel, receives hovered node.
- [ ] `components/explorer/graph3d/GraphLegend.tsx` — translated legend rows.
- [ ] `components/explorer/graph3d/Graph3DView.tsx` — wires `ForceGraph3D` with nodes/links/colors/radii + click & hover handlers + theme-aware background.
- [ ] `pages/Explorer.tsx` — branch on `viewMode`; wrap `Graph3DView` in `React.lazy` + `<Suspense fallback={…}>`.
- [ ] `i18n/en.json` + `es.json` — add `graph3d.*` keys.

## Phase 3 — Refactor
- [ ] Extract `formatSize(bytes)` helper into `lib/format.ts` if duplicated from ContentsPanel/InsightsPanel.
- [ ] Tighten types; no `any`. `ForceGraph3D` ref typed via library's own exports.
- [ ] Confirm code-split: `npm run build` shows Three.js in a separate chunk, not in the main bundle.

## Phase 4 — Verification
- [ ] `npm run test` green (frontend).
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] Backend tests untouched: `.venv/Scripts/python.exe -m pytest -q` still green.
- [ ] **Manual**: scan a medium folder (~500 nodes), switch to 3D, verify pan/zoom/rotate, click-to-focus round-trip, tooltip, legend, both themes, both languages.
- [ ] **Manual**: scan a large folder (>5k nodes if available), verify downsample notice + acceptable perf.

## Phase 5 — Commit & Memory
- [ ] Conventional commit: `feat(m10-graph3d-view): 3D force-directed graph view (see specs/m10-graph3d-view)`.
- [ ] Update `.claude/memory/current.md` with M10 completion + M11 next step.
- [ ] Capture any new lessons (e.g., three.js jsdom quirks, vite optimizeDeps) under `.claude/memory/lessons/` if encountered.
