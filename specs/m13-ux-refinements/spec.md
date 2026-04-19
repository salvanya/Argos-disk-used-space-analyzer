# Spec: M13 — UX Refinements (Resizable columns, sort/group polish, footer, 3D sphere sizing)

## Problem
Several rough edges block daily use of the Explorer:
1. The three Columns-view panels are fixed-width — the user cannot widen the tree to read long paths, nor the middle column to see long filenames without truncation.
2. The middle column opens on whatever sort order was last applied (often alphabetical), but CLAUDE.md §2.2 frames the app as "identify heavy files and folders" — size-desc should be the default when a folder is first opened.
3. The middle-column toolbar places the sort-toggle *before* the group-by selector, but the group dimension logically scopes what is being sorted; the user wants group-by first, then sort.
4. The group-by dropdown renders white text on a white background in dark mode — content is invisible. Light mode is fine and must be left untouched.
5. There is no footer with app attribution. The user (Leandro Salvañá) wants a persistent footer crediting authorship and stating MIT licensing.
6. The M10 3D graph renders every sphere at the same radius, but CLAUDE.md §2.3 is explicit: "Sphere **radius proportional to size** (use log scale to keep tiny items visible)." This is a regression against the stated design.

All six items are UX polish with small blast radius; they are grouped into one milestone because they can ship together without interdependence on the M14 lazy-scan work.

## Goals
- Columns view exposes drag handles between the three panels; drag resizes the panel on the left of the handle and shrinks its right neighbour (and vice-versa) within sane min/max bounds.
- Column widths persist to `localStorage` (per-user, not per-scanned-root) and restore on reload.
- Middle column's default sort, when a folder is first focused in a session, is `size` descending. Subsequent user-chosen sort persists across sibling navigations within the session but resets to size-desc on app reload (or on entering a freshly-scanned root — TBD in Open Questions).
- Toolbar order in the middle column becomes: group-by selector (left) → sort toggle (right). The same visual order applies in both EN and ES.
- The group-by dropdown menu is readable in dark mode: neutral-gray surface (matching other `Popover` / `DropdownMenu` panels) with standard foreground text. Light mode keeps its current appearance.
- A persistent footer renders on every screen (Home + Explorer) with the text `Argos · created by Leandro Salvañá · MIT License`. "Argos" and the author name are proper nouns (not translated); "created by" and "MIT License" follow the active locale.
- The 3D graph scales each sphere's radius as a function of its item size on a logarithmic curve; tiny items remain visible but are clearly smaller than heavy items.

## Non-Goals
- No rework of the overall Explorer layout or addition of a fourth panel; only the three existing columns are resized.
- No new sort dimensions, no multi-column sort, no new group-by buckets (current groups stay: none, extension, type).
- No theme overhaul — **only** the group-by dropdown background is fixed. Other components that may share the same bug will be noted but left for a follow-up ticket.
- No footer links to an external repo, license file, or changelog — just static text in this milestone.
- No changes to the 3D graph beyond `nodeVal` / radius; colors, edges, physics, labels, camera behaviour all stay as M10 shipped them.
- No backend changes. The sphere-sizing fix consumes existing `size` fields from the scan result; no new API surface.

## User Stories
- As a user scanning a deep folder, I grab the separator between the tree and the middle column and drag it right, revealing long paths in the tree without truncating the table's size bars.
- As a user reopening Argos after a week, I find my preferred column widths exactly as I left them.
- As a user focused on freeing space, I click a folder in the tree and the middle column shows its contents already sorted size-desc — the heaviest item is on top without any extra click.
- As a user grouping by extension, I expect the group selector to the left of the sort toggle because I choose what to group *before* I choose how to sort within groups.
- As a dark-mode user opening the group-by dropdown, I see the menu options clearly against a dark surface instead of white-on-white.
- As a visitor to any screen, I see a small footer with `Argos · created by Leandro Salvañá · MIT License`.
- As a user in the 3D view, I can visually distinguish a 50 GB folder from a 5 KB file by sphere size alone — the 50 GB sphere is dramatically larger (but the 5 KB sphere is still perceptible).

## Acceptance Criteria

### 1. Resizable columns
- Given the Explorer is mounted, Then two vertical drag handles are visible: one between tree ↔ middle, one between middle ↔ insights. Each handle is ≥ 4 px wide, shows `col-resize` cursor on hover, and has a visible focus ring for keyboard operation.
- Given I mouse-down on a handle and drag right by N px, Then the left panel grows by N px and the right panel shrinks by N px, subject to per-panel min width (suggested: tree ≥ 200 px, middle ≥ 280 px, insights ≥ 240 px) and max width (no panel exceeds 70 % of viewport).
- Given I release the drag, Then the three widths are written to `localStorage` under `argos-column-widths` as `{ tree: number, middle: number, insights: number }` in pixels.
- Given I reload the app, When Explorer mounts, Then the persisted widths are applied before first paint (no flash of default widths).
- Given the viewport is resized, Then the widths are clamped proportionally so no panel violates its min/max.
- Given the user has never dragged, Then defaults are applied: tree ≈ 22 %, middle ≈ 48 %, insights ≈ 30 % of the available width (same as current static layout).
- Given I focus a handle and press ArrowLeft / ArrowRight, Then the widths change by 16 px per keypress (keyboard accessibility).

### 2. Default sort = size desc in middle column
- Given I open the Explorer on a freshly-scanned root (no prior session state), When the middle column first renders for any focused folder, Then its rows are sorted by `size` descending.
- Given I change the sort to alphabetical ascending mid-session, When I click a sibling folder in the tree, Then the middle column keeps alphabetical ascending (intra-session stickiness).
- Given I reload the app, When the Explorer re-mounts, Then the middle column resets to size-desc (session is the persistence boundary; nothing is written to `localStorage` for sort).

### 3. Toolbar order
- Given the middle-column header renders, Then the group-by selector is the leftmost control and the sort-toggle is immediately to its right; no other controls are introduced or removed.
- Given both locales (EN / ES), Then the visual order is identical (no RTL considerations — both are LTR).

### 4. Group-by dropdown dark-mode fix
- Given the app is in dark theme, When I open the group-by dropdown, Then the menu surface uses the existing `--popover` / `bg-popover` token (or equivalent neutral-gray panel token used by other `DropdownMenu` components in the app) and option text uses `--popover-foreground`; no option is white-on-white.
- Given the app is in light theme, Then the dropdown renders exactly as it does today (visual diff = zero on the light-mode screenshot).
- Given I hover or keyboard-focus an option, Then the hover/focus background matches the app's standard `hover:bg-accent` / `focus:bg-accent` pattern.

### 5. Footer
- Given any screen (Home or Explorer), Then a footer is rendered at the bottom of the viewport with the text `Argos · <t:footer.createdBy> Leandro Salvañá · MIT License`, where `<t:footer.createdBy>` is the translated phrase (EN: "created by", ES: "creado por") and "Argos", "Leandro Salvañá", "MIT License" are literal (not translated).
- Given the footer renders, Then it uses glassmorphism consistent with the rest of the app (`backdrop-blur`, subtle border, muted foreground), occupies full width, and has a height ≤ 40 px.
- Given the viewport is short (e.g., 600 px tall), Then the footer does not overlap active content — scan-progress bars, toasts, or modals take visual precedence as they currently do.
- Given new i18n keys `footer.createdBy` are added, Then they exist in both `en.json` and `es.json`; existing i18n parity test continues to pass.

### 6. 3D sphere sizing proportional to item size
- Given a scanned tree with sizes spanning many orders of magnitude (KB to GB), When the 3D graph mounts, Then each sphere's radius is computed as `radius = baseRadius + k * log10(1 + size_bytes)` (or an equivalent log-scale function documented in the component), clamped to a sensible min/max (suggested: 0.5 ≤ r ≤ 20 in graph units).
- Given two nodes with sizes 1 GB and 1 KB, Then the 1 GB sphere's rendered radius is noticeably larger than the 1 KB sphere's (qualitative acceptance: visibly distinguishable at default zoom).
- Given a zero-byte file, Then its sphere still renders at the minimum radius (not radius = 0, not invisible).
- Given the user hovers a sphere, Then the existing tooltip (name, size, %) continues to work unchanged.

## Tests & quality gates
- Unit: store/hook for persisted column widths (read, write, clamp, default).
- Unit: middle-column default-sort logic (intra-session stickiness, reload reset).
- Component: group-by dropdown renders with `bg-popover` class in dark mode; Vitest + RTL snapshot against dark theme.
- Component: footer renders in both locales with the correct translated phrase.
- Unit: 3D radius function returns monotonically non-decreasing values for non-decreasing sizes, clamps to [min, max], handles size=0.
- Existing full suite (`pytest` + `vitest` + `ruff` + `mypy` + `tsc -b`) passes.
- Frontend Vitest coverage on touched files does not drop.

## Open Questions
1. Default-sort reset boundary: is "app reload" the only reset boundary, or also "entering a different scanned root mid-session"? Default proposal: **reload only** (less surprising). Confirm before implementing.
2. Resize handle visual: minimal 1 px line with a 4 px hit-box (invisible until hover), or a visible 4 px separator with a dot glyph? Default proposal: **invisible-until-hover**, matching the Raycast/Arc aesthetic from CLAUDE.md §5.1.
3. Footer rendering scope: truly every screen, or Explorer only? Default proposal: **every screen** (Home is brief anyway and the attribution belongs there too).
4. Group-by dropdown fix scope: only this one component, or scan the codebase for other `DropdownMenu` / `Select` instances exhibiting the same bug? Default proposal: **only this one** in M13; file a follow-up if others surface.
5. 3D sphere radius formula constants (`baseRadius`, `k`, min, max): pick during implementation via visual inspection against a fixture scan; no need to pre-lock values in the spec.
