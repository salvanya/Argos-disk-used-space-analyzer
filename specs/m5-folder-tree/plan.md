# Plan: M5 — Folder Tree (Left Column)

## Architecture Overview
The tree is implemented as a pure computed flat list of visible nodes derived from `ScanResult.root`. A `useTreeState` hook manages the set of expanded paths (a `Set<string>`). The flat list is fed into a virtualizer (`@tanstack/react-virtual`) for performance. Each item renders as a `TreeRow` presentational component. A `focusedPath` field is added to `explorerStore` so the middle column (M6) can subscribe.

No new backend endpoints needed — all data is already in `scanStore.result`.

## Files Affected

### New files
- `frontend/src/components/explorer/columns/tree/TreeRow.tsx` — single row: indent, chevron, icon, name, size, pct
- `frontend/src/components/explorer/columns/tree/useTreeState.ts` — hook: expanded set, toggle, flat list computation
- `frontend/src/components/explorer/columns/tree/treeUtils.ts` — pure helpers: buildFlatList, formatSize, computePct
- `frontend/src/components/explorer/columns/__tests__/FolderTreePanel.test.tsx` — integration tests
- `frontend/src/components/explorer/columns/tree/__tests__/treeUtils.test.ts` — unit tests for pure helpers

### Modified files
- `frontend/src/components/explorer/columns/FolderTreePanel.tsx` — replace placeholder with real tree
- `frontend/src/stores/explorerStore.ts` — add `focusedPath: string | null` + `setFocusedPath()`
- `frontend/src/i18n/en.json` — add tree-related keys
- `frontend/src/i18n/es.json` — add tree-related keys

## Data Model Changes

### explorerStore additions
```ts
focusedPath: string | null;
setFocusedPath: (path: string | null) => void;
```

### FlatTreeNode (internal type, in treeUtils.ts)
```ts
interface FlatTreeNode {
  node: ScanNode;
  depth: number;
  parentSize: number;   // parent's size for % computation
  hasChildren: boolean;
  isExpanded: boolean;
}
```

## API Surface
No changes. All data flows from `useScanStore().result`.

## Testing Strategy

### Unit tests — `treeUtils.test.ts`
- `buildFlatList` with root only (no children).
- `buildFlatList` with 2 levels, some expanded, some collapsed.
- `buildFlatList` skips hidden folders when `showHidden=false`.
- `buildFlatList` excludes symlinks from children expansion.
- `buildFlatList` marks inaccessible nodes.
- `formatSize` for bytes, KB, MB, GB edge cases.
- `computePct` normal case, division by zero guard.

### Component tests — `FolderTreePanel.test.tsx`
- Shows placeholder text when `scanStore.result` is null.
- Renders root + one level of children when result provided.
- Clicking chevron toggles child rows.
- Clicking a folder row calls `setFocusedPath` with correct path.
- Symlink folder shows link icon, no chevron.
- Inaccessible folder shows lock icon, no chevron.
- Hidden folder (`.git`) is absent when `showHidden=false`, present when `true`.

### Manual verification
1. `python main.py`, scan a folder, verify tree renders.
2. Expand/collapse works.
3. Percentages are correct (children sum ≈ 100% of parent).
4. `showHidden` toggle hides/shows dot-folders.

## Risks & Mitigations
- **Risk:** `@tanstack/react-virtual` not yet installed.
  → Mitigation: add to `package.json`; check it doesn't already exist first. Ask user before installing.
- **Risk:** Very deep trees cause performance issues before virtualization kicks in.
  → Mitigation: virtualization is unconditional (not just at 500 rows) — simpler and always fast.
- **Risk:** Percentage shows 0% for tiny folders due to rounding.
  → Mitigation: show `< 1%` rather than `0%`.

## Rollback Plan
`FolderTreePanel.tsx` currently shows a placeholder; reverting the file restores the placeholder with no side effects. `explorerStore` additions are additive and non-breaking.
