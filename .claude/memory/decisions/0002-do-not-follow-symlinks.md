# Decision 0002: Do Not Follow Symlinks / Junction Points by Default

Status: accepted
Date: 2026-04-16

## Context

Windows makes heavy use of NTFS junction points and symbolic links:
- `C:\Users\<user>\Documents` may be a junction to a cloud-synced folder.
- OneDrive, Dropbox, Google Drive install junctions.
- `C:\ProgramData` contains legacy junctions.
- Package managers (e.g., pnpm) use symlinks inside `node_modules`.

If we follow these during scanning:
- **Double counting** inflates parent sizes falsely. The OS reports each link target only once toward real disk usage.
- **Infinite loops** are possible if the link graph has cycles.
- **Cross-volume traversal** may lead the scanner out of the user's intended scope.

## Decision

Do not follow symlinks or junction points during scan.

- Detect them via `pathlib.Path.is_symlink()` and Windows reparse-point inspection.
- Represent them in the data model with `type="symlink"` and `target` (the resolved path, informational only).
- Display them in the UI with a distinct 🔗 icon.
- **Exclude their content size from parent totals.** Show the link's own size (typically small) only.
- Mark them as non-traversable in both the tree and the 3D graph.

## Alternatives Considered

- **Follow them, with cycle detection**: still double-counts space. Doesn't reflect real disk usage.
- **Follow them only if they stay within the root**: complicates the code; still double-counts within the root.
- **Make it a user toggle**: feasible long-term but not worth the UX complexity now. Revisit if users request it.

## Consequences

**Positive**
- Reported sizes match what the OS would report for actual disk usage.
- No infinite loops, ever.
- Scan completes predictably.

**Negative**
- Users who explicitly want to see the content behind a junction must navigate to the target directly.
- A folder that's mostly composed of junctions (rare) will look small in our UI but feel navigable in Explorer — we must communicate this clearly in the UI (tooltip on the 🔗 icon).

## Follow-ups

- UI tooltip content for the 🔗 icon — write in i18n.
- Consider a future "Show link targets" toggle if users request it.
