# Spec: M10 — 3D Graph View

## Problem
Argos currently only exposes the scanned tree through the three-column Columns view. For large disks, users lose the *gestalt* — they can't see, at a glance, which branches are heavy and how the tree is shaped. A force-directed 3D graph (Obsidian-style) turns the whole scan into an interactive visual map where size is literally visible as sphere radius and hierarchy is visible as edges.

## Goals
- A second, switchable view mode ("3D") accessible from the existing TopMenuBar view-switcher toggle already wired up in M4.
- Interactive 3D force-directed graph of the entire scanned tree: pan, zoom, rotate, hover for tooltip, click to focus.
- Sphere radius encodes node size on a log scale so tiny files remain visible.
- Distinct colors for folders, files, symlinks, and inaccessible nodes, matching the dark-first aesthetic in both themes.
- Selecting a node in 3D view and switching back to Columns view lands on that folder (shared `focusedPath`).
- Graceful handling of very large trees via deepest-level aggregation.
- Legend explaining the color mapping.
- Full i18n (EN/ES) for every user-visible string added by this milestone.

## Non-Goals
- Node search/filter bar inside the graph.
- Screenshot / camera preset / bookmark features.
- 2D graph fallback.
- Performance auto-tuning beyond the fixed downsample threshold.
- Server-side graph computation — the tree already lives in the frontend store; we transform it there.
- Changes to scanner, API, cache, or any Python code.

## User Stories
- As a user who just scanned a 500 GB drive, I want to rotate a 3D graph of the whole tree so I can spot unusually large branches without drilling through folders.
- As a user inspecting the 3D graph, I want to click the biggest sphere and switch back to Columns view to take action (delete, open in Explorer) on that folder.
- As a bilingual user, I want the view switcher, legend, and tooltip labels translated to Spanish when my language is set to Spanish.
- As a user with a huge scan, I want the app to stay interactive — if that means deep branches get aggregated, I want to know (a notice tells me) rather than the tab freezing.

## Acceptance Criteria

**View switching**
- Given a completed scan and the Explorer page, When the user clicks the "3D" toggle in TopMenuBar, Then the three-column grid is replaced by a full-bleed 3D graph; TopMenuBar remains mounted and functional.
- Given 3D view is active, When the user clicks the "Columns" toggle, Then the original three-column grid returns and any previously-focused path is preserved.

**Graph content**
- Given a scan result with N nodes, When `flattenTreeToGraph(root)` runs, Then it produces exactly N graph nodes (one per tree node) and N-1 links (parent→child) — **unless** N exceeds the downsample threshold, in which case deepest leaves are aggregated into "(N items)" pseudo-nodes and the total emitted node count is ≤ threshold.
- Given two nodes with sizes `a` and `b` where `a < b`, Then `nodeRadius(a) ≤ nodeRadius(b)` (monotonic).
- Given a node with size 0, Then its radius equals the minimum clamp (2 units) so it's still clickable.
- Given a symlink node (`is_link === true`), Then it appears with the symlink color and its children (if any) are *not* recursed into.
- Given an inaccessible node (`accessible === false`), Then it appears with the inaccessible color.

**Interaction**
- Given the 3D view is rendered, When the user clicks a sphere, Then `explorerStore.focusedPath` is set to that node's path.
- Given the user hovers a sphere, Then a tooltip shows the node's name, human-readable size, and child count (if folder).
- Given focus changes, When the user switches to Columns view, Then the focused folder is the one that was clicked in 3D.

**Downsampling notice**
- Given a scan result whose node count exceeds the downsample threshold, When 3D view renders, Then a small banner shows the translated "downsampled" notice with the aggregated count.

**i18n**
- Given `i18n.language === "es"`, When the 3D view mounts, Then all labels (legend, tooltip units, notice) render in Spanish.

**Theming**
- Given the light theme is active, Then graph palette uses the light-mode variant and the legend glass panel is readable against the graph background.
- Given the dark theme is active, Then graph palette uses the cool-gradient variant described in CLAUDE.md §5.3.

**Bundle hygiene**
- Given a user who never switches to 3D view, Then Three.js is not loaded on initial page load (verified by `React.lazy` + a chunked build output).

## Open Questions
_None outstanding — user has approved the plan._

Resolved during planning:
- **npm deps** — approved: `react-force-graph-3d`, `three`, `@types/three`.
- **Downsample threshold** — decision deferred to implementer: **5000 nodes**, per CLAUDE.md §6.7.
- **Scope** — strict: graph + view-mode branching only. Search/screenshot/presets deferred to M11 polish.
