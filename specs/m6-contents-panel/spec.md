# Spec: M6 — Middle Column (Contents Panel)

## Problem
The middle column of the Explorer screen is a placeholder. After M5 the user can navigate the folder tree, but clicking a folder shows nothing useful. The middle column must display the direct contents of the focused folder — both files and sub-folders — with enough context (size, % of parent, type) to identify what is eating disk space and act on it.

## Goals
- Show all direct children (files + folders) of `focusedPath` in a sortable table.
- Each row shows: icon, name, size, % of parent, visual bar.
- Table is sortable by name (asc/desc) and size (asc/desc).
- Table can be grouped by node type (folders first, then files) or by file-extension category.
- Clicking a folder row updates `focusedPath` (navigates into it).
- Right-clicking any row opens a context menu with: Copy path, Properties (functional); Open in Explorer + Delete (visible but disabled — M8 will implement them).
- Properties shows a small modal with metadata from scan data.
- Empty state shown when no folder is focused or focused folder has no children.

## Non-Goals
- No backend filesystem calls in M6 (Open in Explorer and Delete wired up in M8).
- No pagination — virtualization only if list > 500 rows (use @tanstack/react-virtual already installed for M5).
- No multi-select.
- No drag-and-drop.
- No in-place rename.

## User Stories
- As a user, I want to click a folder in the tree and immediately see its contents in the middle column, so I can drill into what's taking space.
- As a user, I want to sort by size descending so the heaviest items float to the top.
- As a user, I want to group by type so I can see "how much is images vs code vs archives".
- As a user, I want to right-click a file and copy its path to clipboard quickly.
- As a user, I want to see a properties panel for any item (size, type, last-modified from scan data).

## Acceptance Criteria

**Table population:**
- Given a scan is complete and `focusedPath` is set, When ContentsPanel renders, Then it shows one row per direct child of that node.
- Given `focusedPath` is null, Then the existing empty-state placeholder is shown.
- Given the focused node has no children, Then a "folder is empty" message is shown.
- Symlinks show a 🔗 badge; inaccessible nodes show "—" for size.

**Sorting:**
- Given the user clicks the "Name" header, Then rows sort alphabetically (toggle asc/desc on repeat click).
- Given the user clicks the "Size" header, Then rows sort by size (default desc, toggle on repeat click).
- Sort is purely client-side (no re-fetch).

**Grouping:**
- Given the user selects "Group by type", Then folders appear first (sorted within group), then files grouped by extension category (Images, Documents, Code, Archives, Other).
- Given the user selects "No grouping" (default), Then all items in one flat sorted list.

**Navigation:**
- Given the user clicks a folder row, Then `setFocusedPath` is called with that folder's path, and the tree panel also updates (it already reads from the same store).

**Right-click menu:**
- Given the user right-clicks any row, Then a context menu appears with: Copy path, Properties, Open in Explorer (disabled), Delete (disabled).
- Given the user clicks "Copy path", Then the item's path is written to the clipboard and a toast confirms.
- Given the user clicks "Properties", Then a modal opens showing: full path, size, type, node_type, accessible, is_link.
- Menu closes on Escape or outside click.

**Virtualization:**
- Given the folder has > 500 children, Then rows are virtualised (only DOM nodes in viewport).

## Open Questions
- None — scope deferred to M8 for delete/explorer actions is confirmed.
