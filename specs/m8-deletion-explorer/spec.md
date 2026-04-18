# Spec: M8 — Deletion + Explorer Integration

## Problem
The ContentsPanel context menu shows "Open in Explorer" and "Delete" options but both are
permanently disabled. Users have no way to act on files/folders they discover through Argos —
they must manually navigate Windows Explorer to delete them. This undermines the core value of
the app as an actionable disk-space tool.

## Goals
- Right-click a file or folder → "Open in Explorer" opens Windows Explorer, selecting the item.
- Right-click a file or folder → "Delete" shows a confirmation dialog; confirmed deletion moves
  the item to the Recycle Bin by default.
- A "Delete permanently" checkbox in the confirmation dialog enables irreversible deletion
  (with a clear warning).
- After successful deletion, the item is removed from the displayed list without requiring a full
  rescan.
- All errors (permission denied, path not found) surface as user-visible toasts/messages, never
  crash the UI.

## Non-Goals
- Full rescan trigger after deletion (optimistic removal from UI only; user can Rescan manually).
- Bulk multi-select deletion.
- Keyboard shortcut (Delete key) for deletion — out of scope for M8.
- Undo/restore from Recycle Bin.
- macOS/Linux support for "Open in Explorer" (stubs on non-Windows are acceptable).

## User Stories
- As a user, I want to right-click a folder and open it in Windows Explorer, so I can inspect or
  act on it outside Argos.
- As a user, I want to delete a file via right-click with a confirmation prompt, so I can free
  disk space without leaving Argos.
- As a user, I want the default delete to move items to the Recycle Bin, so I have a safety net
  against accidental deletion.
- As a user, I want a clear warning before permanent deletion, so I am never surprised by data
  loss.

## Acceptance Criteria

**Open in Explorer:**
- Given any node in the ContentsPanel, when I right-click and choose "Open in Explorer", then
  Windows Explorer opens with that item highlighted (using `explorer /select,<path>`).
- Given the API returns a non-2xx status, then a visible error message appears; the UI does not
  crash.

**Delete (Recycle Bin):**
- Given a file node, when I right-click → Delete, then a confirmation modal appears with the
  item name, a "Move to Recycle Bin" description, and Cancel / Delete buttons.
- Given I click Delete in the modal, then the backend moves the item to the Recycle Bin via
  `send2trash`, the modal closes, and the item disappears from the list.
- Given a permission error or other failure, then an error message is shown and the item remains
  in the list.

**Delete permanently:**
- Given I check "Delete permanently" in the confirmation modal, a red warning "This cannot be
  undone." appears.
- Given I confirm permanent delete, the backend calls `os.remove` (file) or `shutil.rmtree`
  (directory) instead of send2trash.

**Safety:**
- The delete endpoint requires `{"confirm": true}` in the request body; if `confirm` is false or
  missing, the server returns 422.
- Deletion is logged server-side at INFO level (path and permanent flag only — never file
  contents).

## Open Questions
- None.
