---
name: persistent-memory
description: Use this skill at the start of EVERY session to load prior context, and at the end of meaningful sessions to persist insights. Bridges the gap between Claude Code sessions so progress isn't lost. Inspired by thedotmack/claude-mem.
---

# Persistent Memory

## Why
Claude Code sessions are stateless. Without a memory protocol, every session starts cold — re-reading files, re-deducing architecture, forgetting hard-won insights. This skill makes the memory explicit, durable, and small.

## Storage Location
All memory lives in `.claude/memory/`:
```
.claude/memory/
├── current.md              # Active session state (what we're in the middle of)
├── architecture.md         # Durable architectural decisions
├── decisions/              # ADR-style records
│   └── 0001-use-sqlite-cache.md
├── lessons/                # Things learned the hard way
│   └── windows-junction-gotchas.md
└── archive/                # Old current.md files, dated
```

All files are **short** (< 200 lines). If a file grows, split or summarize.

## Session Protocol

### 🟢 At the START of each session
1. Read `.claude/memory/current.md` if it exists.
2. Read any `decisions/*.md` relevant to the current task.
3. Read any `lessons/*.md` relevant to the current task.
4. Briefly acknowledge to the user: "Loaded prior context: <one-line summary>."

### 🔴 At the END of each session
Before the conversation ends (or when a natural milestone is reached):

1. **Update `current.md`** if work is in-progress:
   ```markdown
   # Current State — <date>

   ## In Progress
   <feature or task name>

   ## Last completed
   - Commit abc1234: ...

   ## Next step
   Specific, actionable. "Write test for scanner.permission_denied case."

   ## Open questions
   - ...

   ## Loaded context useful for resumption
   - specs/foo/plan.md
   - backend/core/scanner.py (lines 40-120)
   ```

2. **Archive old `current.md`** before overwriting:
   ```
   mv .claude/memory/current.md .claude/memory/archive/YYYY-MM-DD-HHMM.md
   ```

3. **Extract durable insights** to `decisions/` or `lessons/`:
   - **Decision** = "we chose X over Y because Z". Irreversible or expensive to revisit.
   - **Lesson** = "this surprised us; here's the truth". Prevents repeating the mistake.

## Writing Good Memory Entries

### Decision template (`decisions/NNNN-slug.md`)
```markdown
# Decision NNNN: <Title>

Status: accepted | superseded by NNNN
Date: YYYY-MM-DD

## Context
Why was this decision needed?

## Decision
What did we choose?

## Alternatives Considered
- Option A: rejected because ...
- Option B: rejected because ...

## Consequences
- Positive: ...
- Negative: ...
- Follow-ups: ...
```

### Lesson template (`lessons/slug.md`)
```markdown
# Lesson: <Short Title>

## Symptom
What we observed.

## Root cause
Mechanical explanation.

## Fix / workaround
What we do now.

## How to recognize it next time
Specific pattern to watch for.
```

## What NOT to Save
- ❌ Trivia that's already in `CLAUDE.md`.
- ❌ Chat transcripts or full implementation diffs.
- ❌ Personal opinions without technical grounding.
- ❌ TODOs — those go in GitHub issues or `tasks.md`, not memory.
- ❌ Long-winded retrospectives. Keep it tight.

## Size Discipline
- `current.md`: < 50 lines.
- Each decision: < 100 lines.
- Each lesson: < 80 lines.
- Total memory footprint: ideally < 500 lines across all files.

If memory grows beyond this, consolidate — merge related decisions, archive outdated lessons.

## Hard Rules
1. **Never invent memory.** If `current.md` doesn't exist, don't pretend to remember.
2. **Never overwrite without archiving.** Always move the old `current.md` first.
3. **Don't bloat.** Every line in memory costs every future session.
