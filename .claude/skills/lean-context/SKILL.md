---
name: lean-context
description: Use this skill at the start of every task to load only the minimum context needed. Also use when context window feels crowded — to deliberately prune and refocus. Prevents Claude from loading entire modules when a few lines would do. Inspired by yvgude/lean-ctx.
---

# Lean Context

## Philosophy
Context is expensive and noisy. Every token loaded pushes relevant info further from attention. Load **the minimum**, not "everything that might possibly be related".

## The Lean Loading Protocol

### Before loading any file, ask:
1. What exact information do I need?
2. Is it a type/signature, a full function body, or a whole module?
3. Can I answer the question from `CLAUDE.md` alone?

### Loading strategy
- **First**: search + grep, not read. Use `grep` / `rg` to find references, signatures, usages.
- **Second**: read only the specific functions/classes identified.
- **Last resort**: read full files — and only if they're < 300 lines.

### Keep in scope
- The file being modified (always).
- Files directly imported by it (signatures only).
- Relevant test files.

### Do NOT keep in scope
- Historical/legacy code not being touched.
- Files mentioned in conversation 20 turns ago but no longer relevant.
- Dependency source code (read docs instead).

## Context Hygiene

### At the start of each session
- Read `CLAUDE.md`.
- Read `.claude/memory/current.md` if it exists (persisted prior session state).
- Read the spec for the current task if one exists.
- **Nothing else yet.**

### During a task
- When switching focus (e.g., from scanner to frontend), **say so explicitly**: "Switching context to frontend now."
- Summarize the previous context in one sentence before dropping it.

### At the end of a task
- Commit.
- Save insights to `.claude/memory/` if non-trivial.
- Clear mental model of implementation details — only the outcome matters going forward.

## Anti-Patterns to Avoid
- ❌ "Let me read the whole codebase to understand." — No, search first.
- ❌ "I'll keep everything loaded just in case." — Active harm.
- ❌ Loading `package.json` + `pyproject.toml` + full `tsconfig.json` when the task is to fix a typo.
- ❌ Reading 10 test files when you only need the one for the function you're modifying.

## Green Flags
- ✅ Reading a 30-line function after grepping for its name.
- ✅ Using `ls` on a directory to see structure before reading specific files.
- ✅ Asking "do I actually need this?" before every file read.
