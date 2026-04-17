---
name: context-engineering
description: Reference this skill when designing prompts, subagent invocations, or tool interfaces. Provides principles for structuring information so Claude (or subagents) have what they need and nothing more. Inspired by muratcankoylan/Agent-Skills-for-Context-Engineering.
---

# Context Engineering

## Premise
The quality of any LLM output is bounded by the quality of its context. Context engineering is the deliberate practice of structuring what goes in.

## The Four Pillars

### 1. Relevance
Every token in context should be plausibly needed. Prune aggressively.
- Is this file actually referenced by the task?
- Is this entire file needed, or a specific function?
- Is this history still informative, or is it stale?

### 2. Recency / Ordering
Transformers pay more attention to recent tokens. Put the most important context **last**, right before the instruction.
- System-level rules first (CLAUDE.md essentials).
- Stable reference material second (specs, schemas).
- Active task context third.
- Current instruction last.

### 3. Specificity
Vague context produces vague output. Anchor everything concretely.
- ❌ "Make the UI nicer."
- ✅ "Increase padding on the folder-tree rows to 12px vertical, 16px horizontal; ensure the hover state uses `bg-white/[0.03]` as defined in globals.css."

### 4. Structure
Labeled, delimited sections help the model index.
- Use consistent tags: `<spec>`, `<plan>`, `<current_file>`, `<constraints>`.
- Use hierarchical headings in docs.
- Keep one idea per paragraph.

## Patterns for This Project

### When invoking a subagent
Provide:
1. **Role**: one sentence on what they are ("You are a scanner testing specialist").
2. **Input**: explicit inputs they'll receive.
3. **Output contract**: exactly what form of output you expect.
4. **Constraints**: rules from `CLAUDE.md` that apply (don't assume inheritance).
5. **Escalation path**: what to do if blocked.

### When writing a prompt for the FastAPI backend to generate responses
- Pin to specific Pydantic models.
- Include 1–2 concrete examples.
- Specify error shape.

### When writing CLAUDE.md updates
- Rules in imperative form ("Always X", "Never Y").
- Examples when rules are non-obvious.
- Link to skills for deep dives rather than inlining.

## Common Pitfalls

- **Context stuffing**: dumping entire directories "for reference". Actively harmful.
- **Stale context**: old task context carried into a new task, causing cross-contamination.
- **Implicit context**: assuming the model "knows" something from training. Spell it out if it matters.
- **Unstructured walls of text**: 2000 lines of unlabeled prose. Break it up.
- **Conflicting rules**: two places saying different things. Deduplicate and have ONE source of truth.

## The "Minimum Viable Context" Exercise
Before any non-trivial task, ask: if I had to do this with only 2000 tokens of context, what would I keep?
Whatever you'd keep is your MVC. Start there. Add only when you prove you need more.
