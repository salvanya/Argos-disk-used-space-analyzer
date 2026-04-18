# Lesson: Use npm, not pnpm, in Bash tool

## Symptom
`pnpm: command not found` when running `pnpm add` or `pnpm run` via the Bash tool.

## Root Cause
`pnpm` is not on the PATH available to the Claude Code Bash tool on this machine.
`npm` and `node` are both available at `/c/Program Files/nodejs/`.

## Fix / Workaround
Always use `npm install` / `npm run` instead of `pnpm` in Bash tool calls.
The `package.json` still uses pnpm conventions — that's fine; npm can execute the same scripts.

## How to Recognize It Next Time
Any `pnpm` command → substitute `npm` immediately.
