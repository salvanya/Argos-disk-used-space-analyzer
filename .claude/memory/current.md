# Current State — 2026-04-18

## In Progress
Nothing — M4 just completed and committed (fb0d9f8).

## Last Completed
- Commit fb0d9f8: M4 Explorer scaffold (three-column layout, TopMenuBar, RequireScan guard, explorerStore, theme/locale persistence, 11 tests)

## Next Step
Start M5 — Left column: folder tree with sizes and parent-relative percentages.
Run `/plan M5 folder tree` first.
Key constraints:
- IDE-like folder-only tree (à la VS Code), expand/collapse
- Each entry: folder name, size, % relative to its parent level
- Clicking a folder changes focus (updates middle column in M6)
- FolderTreePanel.tsx is the shell to fill in
- ScanResult is already in useScanStore; root node is `result.root`

## Open Questions
- None.

## Files Worth Reloading Next Session
- frontend/src/components/explorer/columns/FolderTreePanel.tsx — left column shell to fill
- frontend/src/stores/scanStore.ts — holds ScanResult.root
- frontend/src/lib/types.ts — ScanNode type (name, path, size, children, node_type)
- frontend/src/stores/explorerStore.ts — showHidden, followSymlinks toggles that affect tree
