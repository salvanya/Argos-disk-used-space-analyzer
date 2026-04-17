# `.claude/memory/`

Persistent context for Claude Code across sessions. See `.claude/skills/persistent-memory/SKILL.md` for the full protocol.

## Layout

```
memory/
├── current.md           # Active session state (gitignored — personal)
├── archive/             # Old current.md snapshots, dated (gitignored)
├── decisions/           # Architectural decisions (committed)
└── lessons/             # Gotchas and hard-won insights (committed)
```

## What's in Git vs not

- ✅ **Committed**: `decisions/` and `lessons/`. These are project-level knowledge everyone benefits from.
- ❌ **Ignored**: `current.md` and `archive/`. These are personal session state.

This split is enforced in `.gitignore`.

## Usage

- At the start of a session: run `/memory-load`.
- At the end of a meaningful session: run `/memory-save`.

## Writing guidelines

Keep files tight — memory that's too large defeats its purpose. See the skill for size limits.
