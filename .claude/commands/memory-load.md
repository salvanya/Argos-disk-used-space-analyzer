---
description: Load prior session context at the start of a new session
---

Load prior session context so we can resume work seamlessly.

Steps:

1. **Trigger the `persistent-memory` skill.**
2. Read `.claude/memory/current.md` if it exists.
3. Read all files in `.claude/memory/decisions/` (they're short).
4. Read lesson files only if they match the active task keywords.
5. Summarize in chat:
   - Where we left off
   - Next step per `current.md`
   - Any open questions that need my input before we proceed
6. Wait for my confirmation or new instructions before acting.

If no prior memory exists, say so clearly — do not invent state.
