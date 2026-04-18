# Spec: M3 — Home Screen

## Problem
The backend is fully operational but has no UI. Users cannot initiate a scan, pick a folder,
or see past scan history. The app displays only a scaffolding placeholder.

## Goals
- User can pick a folder via a native OS dialog and trigger a disk scan.
- User sees real-time scan progress (node count) while waiting.
- User can re-open any recently scanned folder (persisted between sessions).
- User can see whether the process has admin privileges (shield icon in header).
- The UI matches the Argos design system: dark glassmorphism, aurora gradient, Geist font.

## Non-Goals
- Full Explorer screen (M4+) — navigation ends at "scan initiated; progress shown".
- UAC relaunch / "Relaunch as administrator" button (M12).
- Theme toggle, language toggle, advanced scan options (later milestones).
- Any file-system operation other than scanning (delete, open in Explorer).

## User Stories
- As a user, I want to pick a local folder so that Argos scans it and shows me its contents.
- As a user, I want to see scan progress so that I know the app is working.
- As a user, I want to re-open a recent scan without waiting for a full rescan.
- As a user, I want to know whether I'm running as administrator so I can decide whether to relaunch.

## Acceptance Criteria

**AC-1 — Folder picker**
Given the Home screen is open,
When I click "Choose folder",
Then a folder picker dialog opens and the selected path is displayed.

**AC-2 — Scan initiation**
Given a folder is selected,
When I click "Scan",
Then a WebSocket connection opens to `/ws/scan` with the auth token and selected path.

**AC-3 — Progress display**
Given a scan is running,
When the server sends `{"type":"progress","node_count":N}` messages,
Then the UI updates a counter/spinner showing "N items found…".

**AC-4 — Scan completion**
Given the server sends `{"type":"complete","result":{…}}`,
Then the progress indicator transitions to a "Done" state (placeholder — Explorer screen is M4+).

**AC-5 — Recent folders**
Given previous scans exist in the cache,
When the Home screen loads,
Then up to 5 recent scans are shown with path, total size, and scan timestamp.

**AC-6 — Re-open recent scan**
Given a recent folder is shown,
When I click it,
Then a WebSocket scan is initiated with `force_rescan: false` (cache hit → instant).

**AC-7 — Admin indicator**
Given the Home screen loads,
When `GET /api/system/info` returns `{"is_admin": true/false}`,
Then a shield icon appears in the header: filled blue when admin, outlined grey when not.

**AC-8 — Token wiring**
Given the app started (token injected via `/api/config` or env),
When any API call is made,
Then the `X-Argos-Token` header (HTTP) or `token` field (WS) is sent.

## Open Questions
None — all answered by CLAUDE.md and prior session context.
