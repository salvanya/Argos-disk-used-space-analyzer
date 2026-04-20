"""Windows filesystem utilities for Argos.

All functions here are safe to import on non-Windows platforms; they return
sensible defaults (False / 0) when Windows-specific APIs are unavailable.
"""

from __future__ import annotations

import ctypes
import subprocess
import sys
from pathlib import Path

__all__ = [
    "get_file_attributes",
    "is_admin",
    "is_hidden",
    "is_link",
    "is_system_file",
    "open_in_explorer",
]

# Windows file-attribute flag constants
_FILE_ATTRIBUTE_HIDDEN: int = 0x2
_FILE_ATTRIBUTE_SYSTEM: int = 0x4
_FILE_ATTRIBUTE_REPARSE_POINT: int = 0x400
_INVALID_FILE_ATTRIBUTES: int = 0xFFFFFFFF  # GetFileAttributesW failure sentinel


def get_file_attributes(path: Path) -> int:
    """Return the raw Windows file-attribute bitmask for *path*.

    Returns 0 on non-Windows platforms or if the call fails.
    """
    if sys.platform != "win32":  # pragma: no cover
        return 0  # pragma: no cover
    attrs: int = ctypes.windll.kernel32.GetFileAttributesW(str(path))
    if attrs == _INVALID_FILE_ATTRIBUTES:  # pragma: no cover
        return 0  # pragma: no cover
    return attrs


def is_link(path: Path) -> bool:
    """Return True if *path* is a symbolic link **or** an NTFS junction point.

    ``pathlib.Path.is_symlink()`` returns False for NTFS junctions on Python < 3.12.
    This helper covers both cases so callers never need to worry about the
    distinction.  See ``.claude/memory/lessons/windows-junction-detection.md``.
    """
    if path.is_symlink():
        return True
    if sys.platform == "win32":
        # Python 3.12+ added Path.is_junction()
        if hasattr(path, "is_junction") and path.is_junction():
            return True  # pragma: no cover — requires a real NTFS junction to test
        # Fallback: inspect the reparse-point attribute directly
        attrs = get_file_attributes(path)
        if attrs & _FILE_ATTRIBUTE_REPARSE_POINT:  # pragma: no cover
            return True  # pragma: no cover
    return False


def is_admin() -> bool:
    """Return True if the current process has Windows administrator privileges.

    Always returns False on non-Windows platforms.
    """
    if sys.platform != "win32":  # pragma: no cover
        return False  # pragma: no cover
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except OSError:  # pragma: no cover
        return False  # pragma: no cover


def is_hidden(path: Path) -> bool:
    """Return True if *path* has the ``FILE_ATTRIBUTE_HIDDEN`` bit set.

    Uses the Windows attribute on Windows; returns False on other platforms
    (``get_file_attributes`` returns 0 there, so the bit test is always False).
    This avoids unreachable-branch warnings while remaining cross-platform safe.
    """
    return bool(get_file_attributes(path) & _FILE_ATTRIBUTE_HIDDEN)


def open_in_explorer(path: Path) -> None:
    """Open *path* in Windows Explorer with the item selected.

    Calls ``explorer.exe /select,<path>`` on Windows; does nothing on other platforms.
    Raises ``OSError`` if the subprocess cannot be launched.
    """
    if sys.platform != "win32":  # pragma: no cover
        return  # pragma: no cover
    subprocess.Popen(["explorer.exe", f"/select,{path}"])


def is_system_file(path: Path) -> bool:
    """Return True if *path* has the ``FILE_ATTRIBUTE_SYSTEM`` bit set.

    Returns False on non-Windows platforms (same reason as ``is_hidden``).
    """
    return bool(get_file_attributes(path) & _FILE_ATTRIBUTE_SYSTEM)
