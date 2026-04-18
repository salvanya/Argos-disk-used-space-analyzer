# Spec: M5 — Folder Tree (Left Column)

## Problem
After a scan completes, the Explorer left column shows an empty placeholder. The user needs an IDE-like collapsible folder tree that shows sizes and percentages relative to each parent so they can quickly navigate the disk hierarchy.

## Goals
- Render a scrollable, collapsible folder-only tree from the scan result.
- Each row shows: indent, expand/collapse chevron, folder icon (or symlink icon), name, size, and % of its immediate parent.
- Root node is auto-expanded one level on mount.
- Clicking a folder row sets the "focused folder" in state (consumed by M6 middle column later).
- Symlink folders show a distinct icon and are not expandable (no children counted).
- Inaccessible folders shown with muted style and a lock icon; not expandable.
- `showHidden` toggle from explorerStore filters hidden folders.
- Virtualized rendering when the visible node list exceeds 500 rows (`@tanstack/react-virtual`).
- Bilingual (EN/ES) — all UI strings via i18n keys.

## Non-Goals
- Middle column population (M6).
- File nodes — this is folder-only tree.
- Right-click context menu (M8).
- Drag-and-drop reordering.

## User Stories
- As a user, I want to see my disk hierarchy as a collapsible tree so I can drill into the heavy areas.
- As a user, I want to see each folder's size and % of its parent so I know at a glance which branches are heavy.
- As a user, I want to click a folder and have it become the "focused" folder for the middle column.

## Acceptance Criteria
- **Given** a scan result exists, **when** the Explorer renders, **then** the left column shows the root folder and its direct children (1 level expanded).
- **Given** a folder with children, **when** the user clicks the chevron, **then** the children appear/disappear (toggle).
- **Given** any folder row, **when** rendered, **then** it shows name + formatted size + percentage relative to immediate parent.
- **Given** a symlink folder node (`is_link: true`), **when** rendered, **then** it shows a link icon and has no expand chevron.
- **Given** an inaccessible node (`accessible: false`), **when** rendered, **then** it shows muted style + lock icon and is not expandable.
- **Given** `showHidden: false` in explorerStore, **when** tree renders, **then** folders whose name starts with `.` are excluded.
- **Given** a folder row is clicked, **when** the click fires, **then** `explorerStore.focusedPath` is set to that folder's path.

## Open Questions
- None.
