---
description: Review a UI change against the project's design system
---

Perform a design review of the most recent UI changes.

Steps:

1. **Trigger the `ui-ux-excellence` skill.**
2. Identify which components have been modified (via git diff if committed, or review uncommitted changes).
3. For each changed component, walk through the **Design Review Checklist** in the skill:
   - Aesthetic match (Raycast / Arc / Vision Pro / glassmorphism)
   - All states (idle, hover, focus, active, disabled, loading, error, empty)
   - Keyboard navigation
   - Focus rings visible
   - Contrast ≥ 4.5:1
   - No layout shift on hover
   - Spring animations, < 500ms
   - Both themes (light/dark)
   - Both languages (ES/EN fit)
   - Responsive to 1024px
4. For each failed check, propose a concrete fix.
5. Output a summary: what passes, what fails, suggested order of fixes.

**Do NOT auto-apply fixes.** Wait for my approval.
