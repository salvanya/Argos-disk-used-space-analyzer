# Spec: M12 — Admin Relaunch Flow + Advanced Settings

## Problem
The backend already detects admin privileges (`backend/core/windows_utils.is_admin`, exposed via `GET /api/system/info`) and the frontend already stores `isAdmin` in `appStore`, but nothing in the UI surfaces this signal and there is no way for the user to relaunch Argos elevated when a scan hits permission-denied folders under `Program Files`, `Windows`, or other system roots. Separately, the top menu in CLAUDE.md §2.2 promises a "Settings panel (advanced scan options, exclusions, cache management)" that has never been built — `include_system` exists in `ScanOptions` but is unreachable from the UI, there is no exclusion mechanism, and cache management is only available via raw HTTP calls. M12 closes both gaps: a visible elevation affordance and a first-class settings surface.

## Goals
- The Explorer header shows a clear, translated admin-status badge (elevated ↔ standard) and, when not elevated, an always-available "Relaunch as administrator" action.
- Triggering the relaunch action spawns a new elevated Argos process via `ShellExecuteW` with the `runas` verb, then shuts the current (non-elevated) process down cleanly so only one server owns the port.
- A Settings panel (modal or right-side drawer) is reachable from the top menu and exposes, at minimum: include-hidden toggle, include-system toggle, path-exclusion list, and cache management (list cached roots, delete one, clear all).
- Scan options set in the Settings panel persist to `localStorage` and are sent with every new scan (`POST /api/scan`).
- Exclusions are honoured by the scanner: any descendant path matching an exclusion glob is skipped entirely (not counted in size, not listed).
- A new `DELETE /api/scans` endpoint clears all cached scans; existing per-root `DELETE /api/scan/{root_b64}` still works.
- Every new surface is fully i18n'd (EN + ES), keyboard-operable, and carries unit tests; `backend/core/` stays ≥ 85 % covered.

## Non-Goals
- No Unix/macOS elevation flow. Relaunch is Windows-only; on other platforms the button is hidden (the badge still renders as "standard").
- No automatic re-scan after elevation — the user re-triggers the scan themselves from the new elevated window.
- No scheduled scans, no background scanning, no watch-mode.
- No per-folder-specific exclusion rules — exclusions are global (apply to every scan), not stored per scanned root.
- No GUI for editing exclusions via right-click in the tree/table — only the Settings panel.
- No user-configurable cache size limits, TTL, or eviction policies.
- No follow-symlinks toggle. CLAUDE.md §6.6 is explicit that symlinks are **never** followed; the top-menu item listed in §2.2 is superseded by the safety rule. The menu reference will be dropped (documented in Open Questions / Decisions below).
- No change to the auth-token bootstrap flow or localhost binding.

## User Stories
- As a user scanning `C:\Windows`, I see a clear "standard user" badge and a "Relaunch as administrator" button; clicking it reopens Argos with elevation so the next scan can read protected folders.
- As an elevated user, I see a shield badge confirming the elevation so I know the destructive actions I am about to take are running with full access.
- As a user who keeps seeing `node_modules` dominate every scan, I open Settings, add `**/node_modules/**` to the exclusion list, and the next scan skips it.
- As a user who just finished debugging, I open Settings → Cache, see the list of 6 cached roots, delete the stale ones individually, or clear them all in one click.
- As a user of the Spanish UI, every new string in the admin badge, the relaunch button, the Settings panel, and the cache list is translated.
- As a keyboard user, I can open Settings with Tab + Enter, move through every field with Tab, toggle switches with Space, and close the panel with Escape.

## Acceptance Criteria

**Admin badge & elevation**
- Given the app is running non-elevated on Windows, When the Explorer header mounts, Then a pill labelled `header.admin.standard` renders with a neutral icon and a "Relaunch as administrator" button is visible next to it.
- Given the app is running elevated on Windows, When the Explorer header mounts, Then the pill reads `header.admin.elevated` with a shield icon and the relaunch button is hidden.
- Given the app is running on a non-Windows platform, Then the pill reads `header.admin.standard` and the relaunch button is hidden.
- Given I click "Relaunch as administrator", When the confirmation dialog appears, Then I can cancel (no side effects) or confirm.
- Given I confirm the relaunch, When the backend handles `POST /api/system/relaunch-admin`, Then it invokes `ShellExecuteW(None, "runas", sys.executable, <main.py args>, None, 1)` and schedules a graceful shutdown of the current process within 500 ms of the successful spawn.
- Given the UAC prompt is denied, Then the original (non-elevated) process keeps running and the endpoint returns HTTP 403 with `errors.uacDeclined`; the frontend surfaces this in a non-blocking toast (or inline error on the button).
- Given I call the relaunch endpoint on a non-Windows platform, Then it returns HTTP 501 `errors.platformUnsupported`.
- Given the process is already elevated, Then the relaunch endpoint returns HTTP 409 `errors.alreadyElevated`.

**Settings panel — shell**
- Given I click the gear icon in the top menu bar, Then a Settings surface opens with a translated title `settings.title` and a close affordance.
- Given the Settings surface is open, When I press Escape, Then it closes; focus returns to the gear button.
- Given the Settings surface is open, Then `jest-axe(container)` reports zero violations (with `color-contrast` disabled, consistent with M11).

**Settings panel — scan options**
- Given I toggle "Include hidden files", Then the new value persists to `localStorage` under `argos-scan-options` and is included in the next `POST /api/scan` body.
- Given I toggle "Include system files", Then the same persistence + wiring applies.
- Given I reload the app, When the Explorer mounts, Then the toggles reflect the previously-stored values.

**Settings panel — exclusions**
- Given I open the Exclusions section, Then I see a list of current globs (initially empty) and an input to add a new one.
- Given I type `**/node_modules/**` and press Enter (or click Add), Then the glob appears in the list, persists to `localStorage` under `argos-exclusions`, and is sent with the next scan as `options.exclude` (list[str]).
- Given an exclusion glob is present, When the scanner walks the tree, Then any entry whose absolute path matches any glob (via `fnmatch.fnmatch` with forward-slashed path) is skipped entirely — it does not appear in `children`, its size is not added to any ancestor, and it is not counted in `total_files` / `total_folders`.
- Given I click the trash icon next to a glob, Then it is removed from the list and from `localStorage`.

**Settings panel — cache management**
- Given I open the Cache section, Then I see the list of cached roots (via `GET /api/scans`) with path, scanned-at timestamp, and total size.
- Given I click the trash icon next to a cached root, Then `DELETE /api/scan/{root_b64}` is called, the row disappears, and any in-memory scan state referring to that root is untouched.
- Given the list has ≥ 1 cached root, When I click "Clear all", Then a confirmation dialog appears; on confirm `DELETE /api/scans` is called, the list empties, and the backend returns 204.
- Given the backend receives `DELETE /api/scans`, Then `ScanCache.clear()` removes every row from the cache table and the response is 204 No Content (idempotent).

**Backend — scanner exclusions**
- Given `ScanOptions(exclude=["**/node_modules/**"])`, When `DiskScanner.scan()` walks a fixture containing `root/a/node_modules/x.txt`, Then the result tree does not contain a `node_modules` child and its bytes are not included in ancestor sizes.
- Given `ScanOptions(exclude=[])` (default), Then scanner behaviour is byte-identical to the current implementation (regression guard).
- Given a malformed glob that raises from `fnmatch`, Then `ScanOptions` rejects it during Pydantic validation with a clear `ValueError` before the scan starts.

**i18n & a11y**
- Given both locales (`en`, `es`), Then every new key introduced by M12 exists in `i18n/en.json` and `i18n/es.json`; a test enforces parity (extend existing i18n-parity test if present, else add one).
- Given I tab through the Settings surface, Then focus moves in source order through: toggles → exclusions input → each exclusion trash button → cache section → close button; every control shows a visible `:focus-visible` ring.
- Given every new icon-only button, Then it has an `aria-label` bound to an i18n key.

**Tests & quality gates**
- Given the full test suite (`pytest` + `vitest`), Then all pre-existing tests still pass and new tests cover: relaunch endpoint (happy, already-elevated, non-windows, uac-declined), `ScanCache.clear`, scanner exclusion semantics, Settings panel rendering + persistence, admin badge rendering per platform/state.
- Given `ruff check . && mypy backend/core && tsc -b`, Then no errors are reported.
- Given `backend/core/` coverage measurement, Then line coverage remains ≥ 85 %.

## Open Questions
All resolved (user approved all proposals on 2026-04-18):
1. Settings surface: right-side drawer, 480 px, slide-in via `AnimatePresence` (skipped under `prefers-reduced-motion`).
2. Relaunch: new elevated process picks a fresh port; old process shuts down after spawn; stale browser tab on old port is expected.
3. Exclusions: `fnmatch` against forward-slashed *absolute* paths; UI shows an example.
4. CLAUDE.md §2.2 top-menu bullet "Toggle: follow symlinks (default: OFF)" is removed as part of M12 so docs match the §6.6 safety rule.
5. Settings gear lives to the right of the locale toggle in the Explorer header.
