# Tasks: M6 — Middle Column (Contents Panel)

## Phase 1 — Tests (Red)

### contentsUtils.test.ts
- [ ] `getDirectChildren` returns direct children of root node
- [ ] `getDirectChildren` returns direct children of a nested node by path
- [ ] `getDirectChildren` returns null when path not found in tree
- [ ] `sortItems("name","asc")` sorts alphabetically A→Z
- [ ] `sortItems("name","desc")` sorts Z→A
- [ ] `sortItems("size","desc")` sorts largest first
- [ ] `sortItems("size","asc")` sorts smallest first
- [ ] `groupItems("none", items)` returns one group with all items unchanged
- [ ] `groupItems("type", items)` puts folders before files
- [ ] `groupItems("type", items)` groups files by extension category
- [ ] `getFileCategory` maps `.jpg`, `.png` → "Images"
- [ ] `getFileCategory` maps `.pdf`, `.docx` → "Documents"
- [ ] `getFileCategory` maps `.zip`, `.tar` → "Archives"
- [ ] `getFileCategory` maps `.ts`, `.py` → "Code"
- [ ] `getFileCategory` maps unknown extension → "Other"

### ContentsTable.test.tsx
- [ ] Renders empty-state when `focusedPath` is null
- [ ] Renders "folder empty" state when focused node has 0 children
- [ ] Renders correct number of rows for a node with N children
- [ ] Folder rows render a folder icon; file rows render a file icon
- [ ] Symlink rows render 🔗 badge
- [ ] Inaccessible rows show "—" for size and "—" for percent
- [ ] Clicking a folder row calls `setFocusedPath` with correct path
- [ ] Clicking a file row does NOT call `setFocusedPath`
- [ ] Clicking "Name" header sorts by name asc; clicking again sorts desc
- [ ] Clicking "Size" header sorts by size desc; clicking again sorts asc
- [ ] Right-clicking a row opens the context menu
- [ ] Pressing Escape while menu is open closes it
- [ ] Clicking outside the menu closes it
- [ ] Clicking "Copy path" in context menu calls `navigator.clipboard.writeText`
- [ ] Clicking "Properties" opens the PropertiesModal
- [ ] PropertiesModal shows the item's path and size
- [ ] "Open in Explorer" menu item is present but disabled
- [ ] "Delete" menu item is present but disabled

## Phase 2 — Implementation (Green)

- [ ] Create `contentsUtils.ts` with `getDirectChildren`, `sortItems`, `groupItems`, `getFileCategory`
- [ ] Create `ContentsRow.tsx` — single row with icon, name, size bar, %, symlink badge
- [ ] Create `ContextMenu.tsx` — portal-rendered, edge-clamped, Escape/outside-click to close
- [ ] Create `PropertiesModal.tsx` — shadcn Dialog showing node metadata
- [ ] Create `ContentsTable.tsx` — virtual list, sort headers, group headers, wires rows + context menu
- [ ] Update `ContentsPanel.tsx` — replace placeholder with ContentsTable + path→node memo map
- [ ] Add i18n keys to `en.json` and `es.json`

## Phase 3 — Refactor
- [ ] Extract `usePathNodeMap(result)` hook if memo logic is complex
- [ ] Ensure `contentsUtils.ts` has zero React imports (pure TS)
- [ ] Verify no `any` types remain in new files

## Phase 4 — Polish
- [ ] Run `npm run typecheck` — zero errors
- [ ] Run `npm test` — all tests pass
- [ ] Run `npm run lint` — zero warnings
- [ ] Manual smoke test per plan.md verification steps
- [ ] Conventional commit: `feat(m6-contents-panel): contents table with sort, group, context menu (see specs/m6-contents-panel)`
- [ ] Update `current.md` to reflect M6 complete, M7 next
