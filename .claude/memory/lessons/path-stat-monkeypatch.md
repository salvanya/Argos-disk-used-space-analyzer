# Lesson: Monkeypatching Path.stat Must Guard on follow_symlinks

## Symptom
Test for an inaccessible file fails with `PermissionError` propagating out of
`is_link()` → `is_symlink()`, even though `is_symlink()` is supposed to catch
`OSError`. Stack trace ends in the patched `stat()` being called from `lstat()`.

## Root Cause
`Path.lstat()` is implemented as `self.stat(follow_symlinks=False)`.
When `Path.stat` is monkeypatched without checking `follow_symlinks`, the patch
fires for `lstat()` calls too. In Python 3.12 (at least the Anaconda distribution),
`is_symlink()` does NOT wrap `lstat()` in a try/except that catches `PermissionError`
— it only guards against "path not found" errors. So the `PermissionError` leaks out.

## Fix / Workaround
Always guard the raise condition on `follow_symlinks=True`:

```python
_real_stat = Path.stat

def _patched_stat(self: Path, *, follow_symlinks: bool = True) -> os.stat_result:
    if self == target_path and follow_symlinks:
        raise PermissionError("Access denied")
    return _real_stat(self, follow_symlinks=follow_symlinks)

monkeypatch.setattr(Path, "stat", _patched_stat)
```

This leaves `lstat()` (follow_symlinks=False) intact so that `is_symlink()`,
`is_dir()`, and Windows attribute checks work normally.

## How to Recognize It Next Time
- Test crashes inside `is_link()` or `is_symlink()` when the patched path is processed.
- Stack trace shows `lstat()` → `stat(follow_symlinks=False)` → your patch → raise.
- The file you're trying to make "inaccessible" is not a symlink.
