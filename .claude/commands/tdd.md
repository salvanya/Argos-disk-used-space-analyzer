---
description: Start a strict TDD cycle for a given component or feature
argument-hint: <component or behavior to implement>
---

Begin a TDD cycle for:

**$ARGUMENTS**

Protocol:

1. **Trigger the `tdd-discipline` skill.**
2. Identify the smallest next increment of behavior to implement.
3. **RED**: Write the failing test. Show it to me. Run it. Confirm it fails correctly.
4. **GREEN**: Write the minimal code to pass. Run all tests.
5. **REFACTOR**: Clean up, re-run tests after each change.
6. Commit with a conventional commit message (`test:` + `feat:` / `fix:` or combined).
7. Ask me whether to continue to the next increment or stop.

**Hard rule**: if at any point you catch yourself about to write implementation code without a failing test for it, STOP and go back to RED.
