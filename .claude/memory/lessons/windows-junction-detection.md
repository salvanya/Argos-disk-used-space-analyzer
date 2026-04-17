# Lesson: Windows Junction Points Are Not "Symlinks" to `pathlib`

## Symptom
`pathlib.Path.is_symlink()` returns `False` for NTFS **junction points** (e.g., the legacy `C:\Users\All Users` junction), even though they ARE reparse points that should be treated as links for our purposes. This means naive symlink detection misses a large category of Windows links and we end up traversing them, causing double-counts and sometimes permission errors.

## Root cause
Junction points (created with `mklink /J`) and symbolic links (`mklink` or `mklink /D`) are both implemented as NTFS reparse points, but Python's `is_symlink()` historically only checked for the SYMLINK reparse tag — not the JUNCTION tag. This was fixed in Python 3.12 with `Path.is_junction()`, but `is_symlink()` still doesn't cover junctions.

## Fix / workaround
Combine both checks. On Windows, a path is a "link" for our purposes if ANY of these is true:
```python
import os
import sys
from pathlib import Path

def is_link(path: Path) -> bool:
    if path.is_symlink():
        return True
    if sys.platform == "win32" and hasattr(path, "is_junction"):
        return path.is_junction()
    # Python <3.12 fallback: inspect reparse point attribute directly.
    if sys.platform == "win32":
        import ctypes
        FILE_ATTRIBUTE_REPARSE_POINT = 0x400
        attrs = ctypes.windll.kernel32.GetFileAttributesW(str(path))
        if attrs != -1 and (attrs & FILE_ATTRIBUTE_REPARSE_POINT):
            return True
    return False
```

Use this helper everywhere in `backend/core/scanner.py` — never call `is_symlink()` alone on Windows.

## How to recognize it next time
- Scan totals are larger than `dir /s` reports for the same folder.
- Scan enters `C:\Users\All Users\` (junction to `C:\ProgramData`) and double-counts its ~GB.
- `os.walk` emits entries that look like folders but `is_symlink()` says False yet the content is "elsewhere."

## References
- Python 3.12 added `Path.is_junction()` — https://docs.python.org/3/library/pathlib.html#pathlib.Path.is_junction
- Microsoft docs on reparse points — https://learn.microsoft.com/en-us/windows/win32/fileio/reparse-points
