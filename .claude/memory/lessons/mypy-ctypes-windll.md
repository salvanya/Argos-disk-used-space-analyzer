# Lesson: mypy Knows About ctypes.windll on Windows — Don't Add type: ignore

## Symptom
After adding `# type: ignore[attr-defined]` to suppress `ctypes.windll.*` calls,
mypy reports `Unused "type: ignore" comment [unused-ignore]` on those lines.

## Root Cause
mypy ships with ctypes stubs. On Windows (`python_version = "3.11"`, default platform),
`ctypes.windll` resolves correctly — it's not an `attr-defined` error at all.
`warn_unused_ignores = true` in pyproject.toml then flags the suppression as noise.

## Fix / Workaround
Don't add `# type: ignore[attr-defined]` to `ctypes.windll.*` calls. mypy handles
them fine on Windows. Only add ignores when mypy actually reports an error.

Related: `path.is_junction()` (Python 3.12+) also resolves correctly — no ignore needed.

## How to Recognize It Next Time
- mypy error `Unused "type: ignore" comment [unused-ignore]` on a `ctypes.windll.*` line.
- Or on a `Path.is_junction()` call (Python 3.12+ stubs include it).
- Occurs specifically with `warn_unused_ignores = true` (our default).
