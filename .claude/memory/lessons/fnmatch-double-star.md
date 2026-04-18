# Lesson: `fnmatch` treats `**` like `*`, not like gitignore-style globs

## Symptom
A scanner exclusion rule `**/node_modules/**` failed to exclude `C:/proj/node_modules` itself — only its children matched.

## Root cause
Python's `fnmatch` is NOT gitignore-style. `**` is parsed as `*` + `*`
(i.e. a single wildcard segment), and the trailing `/**` requires at
least one more path segment after `/node_modules/`. So:

- `fnmatch("C:/proj/node_modules/pkg/index.js", "**/node_modules/**")` → True
- `fnmatch("C:/proj/node_modules",              "**/node_modules/**")` → **False**

The folder itself never matches the `/**` pattern, so descent into it
is never skipped — defeating the exclusion.

## Fix / workaround
In `backend/core/scanner.py::_is_excluded`, also test the pattern with
the `/**` suffix stripped so the folder itself matches:

```python
def _is_excluded(path: Path, globs: list[str]) -> bool:
    posix = path.as_posix()
    for glob in globs:
        if fnmatch.fnmatch(posix, glob):
            return True
        if glob.endswith("/**") and fnmatch.fnmatch(posix, glob[:-3]):
            return True
    return False
```

## How to recognize it next time
If a user-facing glob uses gitignore conventions (`**/foo/**`,
`**/*.log`) and you reach for `fnmatch`, remember: `**` is just `*`.
Folder-itself and recursive-descendant matching need explicit handling.
Consider `pathspec` (gitignore-compatible) if the rule set grows.
