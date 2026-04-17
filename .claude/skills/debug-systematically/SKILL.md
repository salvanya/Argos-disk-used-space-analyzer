---
name: debug-systematically
description: Use this skill when something is broken — a test fails unexpectedly, the app crashes, a feature misbehaves. Applies a structured debugging protocol instead of random guessing. Especially important for Windows-specific filesystem issues. Inspired by obra/superpowers.
---

# Debug Systematically

## Core Stance
**Bugs are not mysteries. They are mechanical consequences of the code you wrote.**
Your job is to find the exact mechanism, not to "try things".

## The Protocol

### 1. Reproduce reliably
If you can't reproduce it on demand, you can't fix it.
- Minimal reproduction: smallest input + environment that triggers the bug.
- Write a **failing test** that captures the reproduction. This test becomes the regression guard.

### 2. Observe, don't assume
- Read the exact error message. All of it. Including the chained causes.
- Read the actual traceback lines, file by file.
- Check actual values: print/log them or use a debugger. Do NOT assume what `x` contains — look.

### 3. Form hypotheses, rank them
- Write down 2–3 plausible causes.
- For each, predict: "If this is the cause, then I should see X when I do Y."
- Rank by how easy they are to test.

### 4. Test hypotheses, one at a time
- Change ONE variable at a time.
- After each change, confirm the prediction (or refute it).
- If refuted, cross it off the list. Don't hold onto dead theories.

### 5. Find the true root cause
- A fix that "works" without an understood mechanism is suspicious. It may be papering over.
- Keep asking "why does that happen?" until you reach something you can prove.

### 6. Fix, test, guard
- Implement the fix.
- The regression test from step 1 must now pass.
- All other tests must still pass.
- Commit with `fix:` prefix + reference to the symptom.

## Windows Filesystem Debugging Tips

### Common gotchas in this project
- **Path length > 260 chars**: Windows default limit. Prefix paths with `\\?\` to bypass, or enable long paths in Windows settings.
- **Reserved names**: `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`. Never exist as files but can appear in paths.
- **Case-insensitive**: `C:\Foo\` and `C:\foo\` are the same. Don't rely on case for uniqueness.
- **Backslashes vs forward slashes**: Both work in Python, but be consistent. Use `pathlib` everywhere.
- **Junction points vs symlinks**: Different things! `os.path.islink()` may miss junctions. Use `is_junction()` from Python 3.12+ or detect via reparse points.
- **File in use**: Deletion can fail if another process has a handle. Surface clearly to user.
- **Drives not ready**: Network drives, ejected USB. Handle `FileNotFoundError` / `OSError` gracefully.
- **Permissions inheritance**: Admin-elevated process can access files a non-admin cannot. Behavior changes with elevation.

### Quick diagnostic commands (ask user to run)
```powershell
# Show file attributes
Get-ItemProperty <path> | Format-List

# Detect junctions and symlinks
Get-ChildItem <path> -Force | Where-Object { $_.LinkType }

# Check effective permissions
icacls <path>

# Long path support state
Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled
```

## Anti-Patterns to Avoid
- ❌ **Shotgun debugging**: changing many things hoping something works. You'll never know what fixed it.
- ❌ **Blame the framework first**: 99% of the time the bug is in your code, not in FastAPI/React/Python.
- ❌ **Fix the symptom**: adding a try/except that swallows an error is almost always wrong.
- ❌ **Commit the fix without a test**: guarantees the bug will come back.
- ❌ **"It works on my machine"**: write the test that captures the environmental assumption.

## When You're Truly Stuck
After 30 minutes of focused debugging without progress:
1. **Rubber-duck**: explain the problem out loud (to the user, in chat). Often the act of explaining reveals the bug.
2. **Bisect**: use `git bisect` or manual binary search to find the commit that introduced the bug.
3. **Reduce**: keep deleting code from the failing scenario until it stops failing, then re-add bit by bit.
4. **Ask for help**: show the user what you've tried, what you've ruled out, and what hypotheses remain.
