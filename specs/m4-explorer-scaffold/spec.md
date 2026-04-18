# Spec: M4 — Explorer Screen Scaffold

## Problem
After a scan completes, the user is navigated to `/explorer` which shows a placeholder. There is no real Explorer screen yet. M4 builds the full shell: three-column layout, top menu bar, and data wiring from the scan store — all with the glassmorphism aesthetic. No data columns are filled yet (those are M5–M7); this milestone delivers the skeleton and the menu.

## Goals
- Three-column layout renders at `/explorer` with correct proportions (left ~20%, middle ~50%, right ~30%).
- Top menu bar renders with: back button (→ Home), theme toggle, language toggle, hidden-files toggle, symlinks toggle, view-mode switcher (columns ↔ 3D), rescan button.
- Each panel is a glassmorphism surface with its correct heading and an empty-state placeholder.
- The route is guarded: navigating to `/explorer` without a completed scan redirects to `/`.
- Top menu bar actions update their respective toggles in a new `useExplorerStore`.
- Rescan button triggers a new scan of the same path (reuses `useScanStore` + WS).
- Theme toggle applies `.light` class to `<html>` and persists preference to `localStorage`.
- Language toggle switches i18n locale and persists to `localStorage`.
- The layout is responsive: on narrow viewports the three columns stack vertically (but desktop is primary target).

## Non-Goals
- Actual tree content in the left column (M5).
- Actual table content in the middle column (M6).
- Actual charts/insights in the right column (M7).
- 3D graph view rendering (M10).
- Deletion, right-click menus (M8).
- Advanced settings panel (M12).

## User Stories
- As a user, after a scan completes I land on the Explorer screen and see three clearly delineated panels.
- As a user, I can toggle dark/light theme from the menu bar and my preference persists across page reloads.
- As a user, I can toggle the UI language (EN/ES) from the menu bar.
- As a user, I can click "Back" in the menu bar to return to the Home screen.
- As a user, I can click "Rescan" to re-run a scan on the same folder without going back to Home.
- As a user, if I navigate directly to `/explorer` without a completed scan, I am redirected to `/`.

## Acceptance Criteria
- **Given** a completed scan, **when** navigating to `/explorer`, **then** three glass panels are visible with headings "Folders", "Contents", "Insights".
- **Given** the Explorer is open, **when** clicking the theme toggle, **then** `<html>` gains/loses `.light` class and the icon updates.
- **Given** the Explorer is open, **when** clicking the language toggle, **then** the UI language switches between EN and ES.
- **Given** no completed scan (`result === null`), **when** navigating to `/explorer`, **then** the user is redirected to `/`.
- **Given** the Explorer is open, **when** clicking "Rescan", **then** a new WS scan starts and the user sees the progress (shown in the menu bar or a modal).
- **Given** the Explorer is open, **when** clicking "Back", **then** the user is navigated to `/`.

## Open Questions
- None — scope is clear.
