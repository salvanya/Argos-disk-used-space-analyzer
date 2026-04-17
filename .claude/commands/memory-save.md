---
description: Persist important session context and insights to .claude/memory/
---

Persist the current session's important state and insights.

Steps:

1. **Trigger the `persistent-memory` skill.**
2. If `.claude/memory/current.md` already exists, archive it first:
   `mv .claude/memory/current.md .claude/memory/archive/<YYYY-MM-DD-HHMM>.md`
3. Create a fresh `.claude/memory/current.md` with:
   - In-progress task
   - Last completed commit
   - Next step (concrete, actionable)
   - Open questions
   - Files worth reloading next session
4. Identify any durable insights from this session:
   - If an architectural or irreversible decision was made → create `.claude/memory/decisions/NNNN-slug.md`.
   - If a surprising gotcha was learned → create `.claude/memory/lessons/slug.md`.
5. Keep each file tight (see size limits in the skill).
6. Report what was saved.
