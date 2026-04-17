---
name: tdd-discipline
description: Use this skill for ALL production code changes. Enforces red/green/refactor discipline. If you catch yourself writing implementation before a failing test, STOP and trigger this skill. Inspired by obra/superpowers TDD protocol.
---

# TDD Discipline

## The Iron Rule
**No production code is written without a failing test that requires it.**

No exceptions for:
- "This is trivial."
- "I'll add the test after."
- "It's just a refactor" (if behavior changes, it's not a refactor).
- "I'm just prototyping."

## The Cycle

### 🔴 RED — Write a failing test
1. Write the smallest test that expresses the next increment of behavior.
2. Name it descriptively: `test_scanner_marks_inaccessible_folder_without_crashing`.
3. Run it. **Confirm it fails** (and fails for the right reason — not an import error).
4. If the test passes immediately, your test is wrong. Make it meaningful.

### 🟢 GREEN — Minimal code to pass
1. Write the **simplest** code that makes the test pass.
2. It's OK if it's ugly. It's OK if it hardcodes. The goal is only to go green.
3. Run the test. Confirm it passes.
4. Run ALL tests. Confirm nothing else broke.

### ♻️ REFACTOR — Improve without breaking
1. Now (and only now) make the code good: extract, rename, simplify, type.
2. After each small change, run tests again.
3. Stop when the code is clean, not when it's perfect.

## Testing Anti-Patterns — Reject These

- ❌ **Test the implementation**: `assert mock_x.called_with(...)` when the behavior doesn't require that call.
- ❌ **Brittle tests**: asserting on exact log strings, UI pixel values, or internal state.
- ❌ **Over-mocked tests**: mocking everything leaves nothing being tested.
- ❌ **Snapshot-only tests**: they don't express intent and rot silently.
- ❌ **Tests that require specific run order**: each test is independent.

## Testing Green Patterns — Follow These

- ✅ **Behavior-driven**: `"when I scan a folder with a symlink, the symlink's size is NOT added to the parent total"`.
- ✅ **Use real objects when cheap**: a real `tmp_path` directory tree beats a mocked filesystem.
- ✅ **One concept per test**: if you need "and" in the test name, split it.
- ✅ **Fast**: unit tests under 100ms, integration under 1s.
- ✅ **Deterministic**: no time-based flakes, no network, no randomness without seeding.

## Project-Specific TDD

### For the Scanner (`backend/core/scanner.py`)
- Use `pytest`'s `tmp_path` fixture to build test directory trees.
- Create helpers in `tests/fixtures/` for building realistic trees with nested folders, symlinks, hidden files.
- Test EACH edge case as a separate test: permission denied, symlink loop, UTF-8 filenames, very long paths, empty folder.

### For the API (`backend/api/*`)
- Use `httpx.AsyncClient` via `pytest-asyncio`.
- Fixture: a scanner with an in-memory SQLite.
- Assert status codes + response bodies, NOT internal state.

### For React components
- Use `@testing-library/react`.
- Query by accessible role/label, not by test-id unless necessary.
- Simulate user interactions with `userEvent`, not `fireEvent`.
- Avoid asserting class names — assert visible behavior.

## When TDD Is Genuinely Hard

Some things are harder to TDD (e.g., 3D graph rendering, complex animations). For these:
1. First, do a **spike**: quick, throwaway exploration in a branch or scratch file.
2. Learn what the real contract is.
3. **Delete the spike.**
4. Restart with tests → implementation, informed by what you learned.

Do NOT: commit the spike and claim "it works, I'll test later."
