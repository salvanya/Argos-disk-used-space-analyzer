# Tasks: M5 — Folder Tree (Left Column)

## Phase 1 — Tests (Red)
- [ ] Write unit tests in `treeUtils.test.ts` (buildFlatList, formatSize, computePct)
- [ ] Write component tests in `FolderTreePanel.test.tsx`
- [ ] Confirm all new tests fail (red)

## Phase 2 — Implementation (Green)
- [ ] Add `focusedPath` + `setFocusedPath` to `explorerStore.ts`
- [ ] Write `treeUtils.ts` (buildFlatList, formatSize, computePct, FlatTreeNode type)
- [ ] Write `useTreeState.ts` (expanded set, toggle, derived flat list)
- [ ] Write `TreeRow.tsx` (presentational row)
- [ ] Replace placeholder in `FolderTreePanel.tsx` with virtual list + TreeRow
- [ ] Add i18n keys to `en.json` and `es.json`
- [ ] Confirm all tests pass (green)

## Phase 3 — Refactor
- [ ] Ensure no `any` in TypeScript
- [ ] Extract `formatSize` to `frontend/src/lib/formatSize.ts` if useful beyond this panel
- [ ] Run `tsc --noEmit` and fix any type errors
- [ ] Run `pnpm lint` (or `npm run lint`) and fix

## Phase 4 — Polish
- [ ] Run full test suite (`pnpm test`)
- [ ] Manual smoke test: scan a folder, verify tree, expand/collapse, % values
- [ ] Conventional commit: `feat(m5-folder-tree): folder tree with sizes and parent-relative % (see specs/m5-folder-tree)`
- [ ] Update `current.md` → next step is M6
