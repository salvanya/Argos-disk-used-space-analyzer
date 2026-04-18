# Plan: M6 — Middle Column (Contents Panel)

## Architecture Overview
ContentsPanel reads `focusedPath` from `explorerStore` and the full scan tree from `scanStore`. A pure utility function `getDirectChildren(root, path)` walks the tree to find the focused node and returns its children. Sort and group logic lives in `contentsUtils.ts` (pure functions, easy to unit-test). The table renders with `@tanstack/react-virtual` for long lists. The context menu is a headless, portal-rendered div positioned at the cursor. A Properties modal uses a simple Dialog (shadcn). No new backend endpoints are introduced.

## Files Affected

### New files
- `frontend/src/components/explorer/columns/contents/contentsUtils.ts` — pure functions: `getDirectChildren`, `sortItems`, `groupItems`, `getFileCategory`
- `frontend/src/components/explorer/columns/contents/ContentsTable.tsx` — virtualised table with header sort controls
- `frontend/src/components/explorer/columns/contents/ContentsRow.tsx` — single row (icon, name, size, bar, %)
- `frontend/src/components/explorer/columns/contents/ContextMenu.tsx` — right-click portal menu
- `frontend/src/components/explorer/columns/contents/PropertiesModal.tsx` — properties dialog
- `frontend/src/components/explorer/columns/contents/__tests__/contentsUtils.test.ts` — unit tests
- `frontend/src/components/explorer/columns/contents/__tests__/ContentsTable.test.tsx` — component tests

### Modified files
- `frontend/src/components/explorer/columns/ContentsPanel.tsx` — replace placeholder with ContentsTable
- `frontend/src/i18n/en.json` — new keys under `explorer.contents.*`
- `frontend/src/i18n/es.json` — Spanish translations

## Data Model Changes
No new Pydantic models. New TypeScript types in `contentsUtils.ts`:

```ts
type SortKey = "name" | "size";
type SortDir = "asc" | "desc";
type GroupMode = "none" | "type";

interface SortState { key: SortKey; dir: SortDir }

interface ContentGroup {
  label: string;       // "Folders", "Images", "Documents", …
  items: ScanNode[];
}
```

## API Surface
No new endpoints. All data is derived from the already-loaded `ScanResult` tree.

## Testing Strategy

**Unit tests (`contentsUtils.test.ts`):**
- `getDirectChildren` returns correct children for a given path (including root).
- `getDirectChildren` returns `null` when path not found.
- `sortItems` sorts by name asc/desc and size asc/desc correctly.
- `groupItems("none", items)` returns a single group with all items.
- `groupItems("type", items)` puts folders first, then files by category.
- `getFileCategory` maps known extensions to correct category; unknown → "Other".

**Component tests (`ContentsTable.test.tsx`):**
- Renders empty-state when `focusedPath` is null.
- Renders empty-state when focused node has no children.
- Renders correct row count for a node with children.
- Clicking a folder row calls `setFocusedPath`.
- Clicking "Size" header twice toggles sort asc→desc→asc.
- Right-click opens context menu; Escape closes it.
- "Copy path" writes to `navigator.clipboard.writeText` (mocked).
- "Properties" opens modal showing node path.
- Symlink rows show 🔗 badge.
- Inaccessible rows show "—" for size.

**Manual verification:**
1. Run dev server (`python main.py` or `npm run dev`).
2. Scan a real folder.
3. Click folders in the tree → verify contents update in middle column.
4. Sort by name and size, verify ordering.
5. Switch group mode, verify folder/category groups appear.
6. Right-click a file → copy path → paste into Notepad to confirm.
7. Right-click → Properties → verify modal data matches known file.
8. Confirm Open in Explorer and Delete are visible but non-interactive (grayed).

## Risks & Mitigations
- **Risk:** `getDirectChildren` O(n) tree walk is slow on huge trees (>500k nodes).  
  **Mitigation:** build a `path→node` map once in a `useMemo` keyed on `result`; walk only once per scan result change.
- **Risk:** Context menu positioned off-screen on right/bottom edges.  
  **Mitigation:** clamp `left`/`top` to `window.innerWidth - menuWidth` / `window.innerHeight - menuHeight` after measuring.
- **Risk:** `@tanstack/react-virtual` only kicks in at >500 rows; smaller lists are simpler DOM.  
  **Mitigation:** always use the virtual hook — when list < 500, all items are "visible" and no scrollbar appears. Consistent code path.
- **Risk:** jsdom lacks `ResizeObserver` (affects `@tanstack/react-virtual` in tests).  
  **Mitigation:** same mock used in M5 tree tests (lesson already in memory).

## Rollback Plan
ContentsPanel is currently a placeholder stub. Any failure reverts to that stub — just revert the ContentsPanel.tsx change. No backend changes to undo.
