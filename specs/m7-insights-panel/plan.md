# Plan: M7 — Insights Panel (Right Column)

## Architecture Overview

The InsightsPanel reads `focusedPath` from `explorerStore` and the scan tree from `scanStore`.
It calls `getDirectChildren` (already in `contentsUtils`) to get the children of the focused folder,
then derives four visualisations from them using a new pure-function module `insightsUtils.ts`.
Recharts (`PieChart` + `BarChart`) handles the charts. No new backend endpoints needed.

---

## Files Affected

### New files
- `frontend/src/components/explorer/columns/insights/insightsUtils.ts`
  — pure helpers: `getPieData`, `getTopN`, `getSummaryStats`, `getTypeBreakdown`
- `frontend/src/components/explorer/columns/insights/__tests__/insightsUtils.test.ts`
  — unit tests for all pure helpers
- `frontend/src/components/explorer/columns/insights/__tests__/InsightsPanel.test.tsx`
  — component tests (render sections, empty state, data-driven)

### Modified files
- `frontend/src/components/explorer/columns/InsightsPanel.tsx`
  — replace placeholder shell with full implementation
- `frontend/src/i18n/en.json` — add `explorer.insights.*` keys
- `frontend/src/i18n/es.json` — add `explorer.insights.*` keys (Spanish)

---

## Data Model Changes

No new types. Everything derives from `ScanNode[]` (direct children of focused folder).

TypeScript interfaces local to `insightsUtils.ts`:

```ts
export interface PieSlice  { name: string; value: number; color: string }
export interface TopNItem   { node: ScanNode; pct: number }
export interface SummaryStats {
  totalSize: number;
  fileCount: number;
  folderCount: number;
  largestFile: ScanNode | null;
  deepestPath: string | null;
}
export interface TypeBreakdownRow { category: string; size: number; count: number; pct: number }
```

---

## API Surface

None — no new backend endpoints.

---

## insightsUtils API

```ts
getPieData(children: ScanNode[], maxSlices?: number): PieSlice[]
// Top maxSlices (default 8) by size; remainder collapsed into "Other".
// Color: folders get accent blue/violet, files get viridis-like scale.

getTopN(children: ScanNode[], n?: number): TopNItem[]
// Top n (default 10) by size, with pct = item.size / sum(children.size).

getSummaryStats(children: ScanNode[], root: ScanNode): SummaryStats
// fileCount/folderCount = direct children counts.
// largestFile = largest file node among direct children.
// deepestPath = re-uses the full scan root to find the globally deepest reachable path
//   (BFS/DFS on root, not just children — shows absolute deepest in the tree).

getTypeBreakdown(children: ScanNode[]): TypeBreakdownRow[]
// Aggregate files-only by getFileCategory; sorted by size desc.
// Folders counted as "Folders" category.
```

---

## UI Sections (InsightsPanel.tsx)

1. **Header** — "Insights" label (existing pattern).
2. **Empty state** — when `focusedPath` is null or children is empty (existing placeholder).
3. **Summary stats strip** — 4 stat tiles: Total size, Files, Folders, Largest file.
4. **Pie chart** — Recharts `PieChart` + `Tooltip` + `Legend`. Compact, ~200px height.
5. **Top 10 heaviest** — list with name, size, and an inline `% bar` (CSS width driven by pct).
6. **File type breakdown** — small table: icon, category, count, size, % bar.

All sections only render when data is available (no charts with empty data).

---

## Testing Strategy

### Unit tests — `insightsUtils.test.ts`
- `getPieData`: correct slices, "Other" collapse at > maxSlices, zero-size children ignored.
- `getTopN`: returns top n sorted desc, pct sums ≤ 1, handles n > children.length.
- `getSummaryStats`: correct counts, null largestFile when no files, deepest path via DFS.
- `getTypeBreakdown`: folders aggregated, files bucketed by category, sorted by size.

### Component tests — `InsightsPanel.test.tsx`
- Renders empty state when `focusedPath` is null.
- Renders all four sections when data is present.
- Summary stats show correct formatted values.
- Top-N list renders correct item names.
- Type breakdown shows correct category rows.
- (No Recharts internals tested — only data-visible text.)

### Manual verification
- Navigate to a real scanned folder → panel populates.
- Click a different folder → panel updates reactively.
- Click root folder → all stats reflect root-level data.

---

## i18n Keys to Add

```jsonc
"insights": {
  "summary": "Summary",
  "totalSize": "Total size",
  "files": "Files",
  "folders": "Folders",
  "largestFile": "Largest file",
  "deepestPath": "Deepest path",
  "topHeaviest": "Top {{n}} heaviest",
  "typeBreakdown": "By file type",
  "pieTitle": "Space breakdown",
  "other": "Other",
  "noData": "Select a folder to see insights."
}
```

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Recharts not yet installed | Check `package.json` — if missing, ask user before installing |
| `getSummaryStats` deepest-path DFS expensive on huge trees | Cap at 10 000 nodes; return `null` if limit reached |
| PieChart with 0-size folder renders ugly | Filter out zero-size nodes before building pie data |
| Recharts types mismatch / TS errors | Use `unknown` + narrowing if needed; do not suppress with `any` |
| i18n key collision with `emptyInsights` | Keep old key, add new `insights.*` namespace |

---

## Rollback Plan

`InsightsPanel.tsx` currently renders a placeholder. If something breaks, revert the file to its placeholder state — no other components depend on it.

---

## Task Order (TDD)

1. Write `insightsUtils.test.ts` (all red).
2. Implement `insightsUtils.ts` (green).
3. Write `InsightsPanel.test.tsx` (red).
4. Implement full `InsightsPanel.tsx` (green).
5. Add i18n keys (en + es).
6. Run `pnpm test`, `pnpm tsc --noEmit`, fix any issues.
7. Conventional commit: `feat(m7-insights-panel): insights panel with pie chart, top-N, stats (see specs/m7-insights-panel)`.
