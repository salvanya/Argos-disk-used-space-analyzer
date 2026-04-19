# Decision 0005: Lazy (on-demand) scanning over eager full-tree scan

Status: accepted (direction); flavor TBD in M14 planning
Date: 2026-04-19

## Context
CLAUDE.md §2.4 originally mandated "Complete scan (not lazy/progressive) — show progress indicator during scan." The reasoning: simpler data model, deterministic totals, one WebSocket progress stream from 0 → 100 %. That requirement predated real-world testing.

Real-world pain surfaced during user testing: scanning large roots like `C:\` (hundreds of GB, millions of inodes) blocks first paint for minutes even with the progress bar, holds the whole tree in memory, and a single slow/permission-blocked subtree deep in the walk stalls the entire first render. The user explicitly requested the reversal on 2026-04-19.

## Decision
Move to a lazy, per-level scanning model (spec: `specs/m14-lazy-scanning/spec.md`):
- Initial scan returns the root's **direct children** only.
- Expanding a folder in the tree / middle column / 3D view triggers `scan_level(path)` for that folder.
- `ScanCache` stores per-folder partial results keyed by absolute path.
- The existing `DiskScanner.scan()` (full subtree) remains available for opt-in deep scans and tests.

The concrete *flavor* is still open:
- **(a) Pure lazy** — child folder sizes unknown until that child is expanded. Top-level totals are lower bounds.
- **(b) Lazy-first-paint + background refine** — first response has shallow-recursive sizes per child; a background task walks deeper to refine the visible numbers.

User will pick (a) or (b) at the start of M14 implementation.

## Alternatives Considered
- **Keep eager full-scan, add multiprocessing** — addresses speed but not the memory and permission-wall latency issues; does not change the "nothing visible until fully done" UX. Rejected.
- **Eager full-scan with progressive WebSocket tree updates (push children as they are discovered)** — closer to acceptable UX but keeps the full-tree memory cost and still serialises the walk. Rejected for the same latency reasons.
- **Write the scanner in Rust via pyo3** — CLAUDE.md §11 left this as a fallback if Python scanner is too slow; the lazy model is strictly simpler and makes the Rust question unnecessary for now. Deferred.

## Consequences
Positive:
- First paint on `C:\` drops from minutes to under a second (target).
- Memory footprint scales with what the user actually explores.
- Permission walls in deep, unvisited subtrees no longer delay first paint.

Negative:
- Percentages and totals become *current-known* values that change as the user drills down; the UI must communicate "not yet scanned" clearly (M14 default proposal: "—" with tooltip).
- `ScanCache` schema changes; existing eager-scan cache entries become incompatible.
- CLAUDE.md §2.4 must be rewritten in the same commit series as M14 code, or the project instructions contradict the shipped behaviour.
- The insights panel (top-N heaviest, largest file, deepest path) becomes a "within what has been scanned" view rather than a global view — a semantics shift the UI must surface.

## Follow-ups
- Resolve M14 Open Question #1 (flavor) before any code.
- Decide fate of `POST /api/scan` (keep / alias / remove) — spec default: alias to `scan_level(root)`.
- Update CLAUDE.md §2.4 as part of the M14 merge.
