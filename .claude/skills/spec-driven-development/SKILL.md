---
name: spec-driven-development
description: Use this skill whenever the user asks to add a new feature, implement functionality, or make non-trivial changes. Produces a formal spec before any code is written, then a plan, then implementation guided by that spec. Prevents scope creep and ambiguous requirements. Inspired by the LIDR-academy/manual-SDD methodology.
---

# Spec-Driven Development (SDD)

## When to Use
Trigger this skill for **any** of:
- New feature request (e.g., "add a quick-look preview").
- Non-trivial modification (> ~50 LoC or touching multiple modules).
- Anything that changes the public API (backend routes, frontend props contracts).
- Ambiguous requests where scope could balloon.

**Do NOT** trigger for: typo fixes, trivial refactors, dependency version bumps, tiny CSS tweaks.

## The Three Artifacts

Every feature produces three Markdown files in `specs/<slug>/`:
1. `spec.md` — WHAT and WHY (user-facing behavior, acceptance criteria).
2. `plan.md` — HOW (technical approach, files touched, risks).
3. `tasks.md` — STEP-BY-STEP (checklist, TDD-ordered).

## Workflow

### Step 1 — Spec (`spec.md`)
Template:
```markdown
# Spec: <Feature Name>

## Problem
One paragraph. What is the user trying to do that's currently painful or impossible?

## Goals
Bulleted outcomes. Observable, user-visible.

## Non-Goals
What this feature will NOT do. Explicit scope boundaries.

## User Stories
- As a <role>, I want <action>, so that <outcome>.

## Acceptance Criteria
Given/When/Then format. Each one must be testable.

## Open Questions
Anything unresolved. Ask the user before proceeding to Plan.
```

### Step 2 — Plan (`plan.md`)
Template:
```markdown
# Plan: <Feature Name>

## Architecture Overview
2–4 sentences describing the approach.

## Files Affected
- `path/to/file.py` — what changes
- `path/to/other.tsx` — what changes

## Data Model Changes
Any new Pydantic models, DB tables, or TypeScript types.

## API Surface
New or modified endpoints, request/response shapes.

## Testing Strategy
- Unit tests for: ...
- Integration tests for: ...
- Manual verification steps: ...

## Risks & Mitigations
- Risk: ... → Mitigation: ...

## Rollback Plan
How to revert if it goes wrong.
```

### Step 3 — Tasks (`tasks.md`)
Template:
```markdown
# Tasks: <Feature Name>

## Phase 1 — Tests (Red)
- [ ] Write failing test for <behavior A>
- [ ] Write failing test for <behavior B>

## Phase 2 — Implementation (Green)
- [ ] Implement <thing> to pass test A
- [ ] Implement <thing> to pass test B

## Phase 3 — Refactor
- [ ] Extract <helper>
- [ ] Tighten types

## Phase 4 — Polish
- [ ] Update CLAUDE.md if rules changed
- [ ] Update i18n/en.json and i18n/es.json
- [ ] Run full test suite + linter
- [ ] Conventional commit
```

## Hard Rules
1. **No code before a spec exists.** If the user rushes you, push back politely and propose a minimal spec first.
2. **Spec must be read aloud to the user and confirmed.** No ninja implementation.
3. **If a question in "Open Questions" is unanswered, stop and ask.** Do not assume.
4. **When reality diverges from plan during implementation, update the plan** — never let docs rot silently.
5. **Link the commit to the spec**: `feat(<slug>): <summary> (see specs/<slug>)`.

## Red Flags — Stop and Reconsider
- The spec is longer than 2 pages → feature is too big, split it.
- Acceptance criteria can't be expressed as tests → requirements are too vague.
- "Plan" section has "we'll figure out X later" → not ready to implement.
