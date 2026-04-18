# Plan: M10 — 3D Graph View

## Architecture Overview
Introduce a second view mode for the Explorer that renders the full scanned tree as an Obsidian-style force-directed 3D graph using `react-force-graph-3d` (built on Three.js). `Explorer.tsx` will branch on `explorerStore.viewMode`: `"columns"` keeps the existing three-column layout; `"3d"` renders a new `<Graph3DView>` full-bleed inside the same page shell (TopMenuBar stays mounted). The graph is derived from `scanStore.result.root` via a pure `flattenTreeToGraph(root)` helper that produces `{ nodes, links }` with log-scaled radii and type-based colors. Node click syncs back into `explorerStore.focusedPath` so returning to Columns view lands on the inspected folder.

## Files Affected

### Create
- `frontend/src/components/explorer/graph3d/Graph3DView.tsx` — full-bleed view wrapping `<ForceGraph3D>`, handles resize, click-to-focus, hover tooltip.
- `frontend/src/components/explorer/graph3d/graphData.ts` — pure functions: `flattenTreeToGraph(root, options)`, `nodeRadius(size)` (log scale, clamped), `nodeColor(node)` (folder vs. file vs. symlink vs. inaccessible).
- `frontend/src/components/explorer/graph3d/GraphLegend.tsx` — small glass-panel legend showing color mapping.
- `frontend/src/components/explorer/graph3d/NodeTooltip.tsx` — floating tooltip (name, size formatted, % of parent).
- `frontend/src/components/explorer/__tests__/graphData.test.ts` — pure unit tests for flatten/radius/color.
- `frontend/src/components/explorer/__tests__/Graph3DView.test.tsx` — interaction tests using mocked `react-force-graph-3d`.
- `specs/m10-graph3d-view/spec.md` — formal spec (to be written if user approves this plan).
- `specs/m10-graph3d-view/tasks.md` — TDD task checklist.

### Modify
- `frontend/package.json` — add `react-force-graph-3d` + peer `three` (+ `@types/three` dev).
- `frontend/src/pages/Explorer.tsx` — branch on `viewMode` between Columns and Graph3D.
- `frontend/src/test-setup.ts` — stub `react-force-graph-3d` (WebGL unavailable in jsdom, same pattern as tanstack-virtual mock).
- `frontend/src/i18n/en.json` + `es.json` — new keys: `graph3d.emptyState`, `graph3d.legend.folder`, `graph3d.legend.file`, `graph3d.legend.symlink`, `graph3d.legend.inaccessible`, `graph3d.tooltip.size`, `graph3d.tooltip.children`, `graph3d.downsampledNotice`.
- `frontend/vite.config.ts` — may need `optimizeDeps.include = ["three"]` if Vite struggles to pre-bundle.

## Data Model Changes
No backend changes. Pure frontend transformation:

```ts
interface GraphNode {
  id: string;          // node.path
  name: string;
  kind: "folder" | "file" | "symlink" | "inaccessible";
  size: number;
  radius: number;      // log-scaled, clamped [2, 40]
  color: string;       // hex from palette
  depth: number;
}
interface GraphLink {
  source: string;      // parent path
  target: string;      // child path
}
interface GraphData { nodes: GraphNode[]; links: GraphLink[]; }
```

## API Surface
None. Frontend-only milestone.

## Testing Strategy

**TDD, frontend-only, Vitest + RTL.**

### Unit (pure, no mocks needed)
- `graphData.test.ts`
  - flattens a 3-level tree into N nodes / N-1 links.
  - excludes symlink targets from being recursed into (respects `is_link`).
  - marks inaccessible nodes with `kind: "inaccessible"`.
  - radius: log-scaled; size 0 → min radius; monotonic with size.
  - deterministic output (stable id = path).

### Component (mocked `react-force-graph-3d`)
- `Graph3DView.test.tsx`
  - Renders graph with mocked `<ForceGraph3D>` when `result` present.
  - Shows empty state when `result` is null (defensive).
  - Clicking a node calls `explorerStore.setFocusedPath(path)`.
  - Legend keys render translated strings (verify via i18n key pass-through in tests).
  - Downsampling notice appears when node count > 5000.

### Integration / view-mode switching
- `Explorer.test.tsx` (new or extend existing) — switching `viewMode` from store renders `<Graph3DView>` instead of the three-column grid; TopMenuBar remains.

### Manual verification (required; documented in tasks.md)
- `npm run dev` → scan a medium folder (~500 nodes) → switch to 3D view → verify:
  - Spheres scale visibly with size.
  - Pan / zoom / rotate smooth.
  - Click a sphere focuses it; switching back to Columns view lands on that folder.
  - Light and dark modes both look premium (graph background + legend glass panel).
- Scan a large folder (>5k nodes) → verify downsampling notice + reasonable perf (≥ 30 fps interaction).

### Not tested automatically
- WebGL rendering fidelity (jsdom has no WebGL). Manual only.
- Physics simulation behavior. Rely on library.

## Risks & Mitigations
- **Risk:** `react-force-graph-3d` pulls in Three.js (~600 KB gzipped) → bundle bloat on Home screen users who never open 3D view.
  **Mitigation:** `React.lazy()` + `Suspense` around `<Graph3DView>`; code-split so Three.js loads only when `viewMode === "3d"`.
- **Risk:** WebGL unavailable in jsdom → component tests crash on import.
  **Mitigation:** Mock `react-force-graph-3d` in `test-setup.ts` to export a lightweight stub that records props.
- **Risk:** Very large trees (>50k nodes) freeze the browser.
  **Mitigation:** Downsample in `flattenTreeToGraph` — when node count exceeds threshold (default 5000), collapse deepest levels into aggregated "more (N items)" pseudo-nodes; surface `graph3d.downsampledNotice` to the user.
- **Risk:** Log-scale radius makes 1-byte files invisible.
  **Mitigation:** Clamp min radius to 2 (approx. 3 px on screen). Tooltip still shows true size on hover.
- **Risk:** Node color contrast fails light-mode accessibility.
  **Mitigation:** Two palettes (dark-mode cool gradient, light-mode slightly desaturated) chosen by `appStore.theme`; legend always on.
- **Risk:** Adding new npm dependencies without explicit user approval violates CLAUDE.md §7.5.
  **Mitigation:** **Stop and get user approval** before running `npm install react-force-graph-3d three @types/three`. This is an explicit open question below.

## Rollback Plan
Single commit on main. Revert with `git revert <sha>`. No DB migrations, no API contract changes. If the 3D lib turns out to be unworkable we can drop the view mode toggle in TopMenuBar back to a no-op or swap `react-force-graph-3d` for `3d-force-graph` (lower-level, no React wrapper) without changing the spec.

## Open Questions (require user decision before I proceed)
1. **Approve adding npm deps?** `react-force-graph-3d` + `three` (peer) + `@types/three` (dev). ~600 KB gzipped, but we'll lazy-load.
2. **Downsampling threshold.** Default 5000 nodes per CLAUDE.md §6.7 — OK as-is, or a different number?
3. **Scope of this milestone.** Strictly the 3D graph + view-mode branching? Or include bells like node search, screenshot export, camera presets? (Recommend: strict scope, defer extras to M11 polish.)
4. **Also produce `spec.md` + `tasks.md` now**, or do you want to review this plan first and I'll expand after approval?
