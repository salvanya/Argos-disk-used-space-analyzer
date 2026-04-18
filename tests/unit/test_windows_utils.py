"""Unit tests for backend.core.windows_utils."""

from __future__ import annotations

import ctypes
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from backend.core.windows_utils import is_admin, is_hidden, is_link, is_system_file, open_in_explorer

# ---------------------------------------------------------------------------
# is_link
# ---------------------------------------------------------------------------


def test_is_link_returns_false_for_regular_file(tmp_path: Path) -> None:
    f = tmp_path / "regular.txt"
    f.write_text("hello", encoding="utf-8")
    assert is_link(f) is False


def test_is_link_returns_false_for_regular_dir(tmp_path: Path) -> None:
    d = tmp_path / "regular_dir"
    d.mkdir()
    assert is_link(d) is False


def test_is_link_returns_true_for_symlink_file(tmp_path: Path) -> None:
    target = tmp_path / "target.txt"
    target.write_text("hello", encoding="utf-8")
    link = tmp_path / "link.txt"
    try:
        link.symlink_to(target)
    except (OSError, NotImplementedError):
        pytest.skip("Cannot create symlinks without elevated privileges or Developer Mode")
    assert is_link(link) is True


def test_is_link_returns_true_for_symlink_dir(tmp_path: Path) -> None:
    target = tmp_path / "target_dir"
    target.mkdir()
    link = tmp_path / "link_dir"
    try:
        link.symlink_to(target, target_is_directory=True)
    except (OSError, NotImplementedError):
        pytest.skip("Cannot create symlinks without elevated privileges or Developer Mode")
    assert is_link(link) is True


# ---------------------------------------------------------------------------
# is_admin
# ---------------------------------------------------------------------------


def test_is_admin_returns_bool_without_raising() -> None:
    result = is_admin()
    assert isinstance(result, bool)


# ---------------------------------------------------------------------------
# is_hidden  (Windows-specific attribute; non-Windows uses dot-prefix convention)
# ---------------------------------------------------------------------------


def test_is_hidden_returns_false_for_normal_file(tmp_path: Path) -> None:
    f = tmp_path / "normal.txt"
    f.write_text("hello", encoding="utf-8")
    assert is_hidden(f) is False


@pytest.mark.skipif(sys.platform != "win32", reason="Windows FILE_ATTRIBUTE_HIDDEN only")
def test_is_hidden_returns_true_for_hidden_file(tmp_path: Path) -> None:
    f = tmp_path / "hidden.txt"
    f.write_text("hello", encoding="utf-8")
    file_attribute_hidden = 0x2
    ctypes.windll.kernel32.SetFileAttributesW(str(f), file_attribute_hidden)  # type: ignore[attr-defined]
    assert is_hidden(f) is True


# ---------------------------------------------------------------------------
# is_system_file
# ---------------------------------------------------------------------------


def test_is_system_file_returns_false_for_normal_file(tmp_path: Path) -> None:
    f = tmp_path / "normal.txt"
    f.write_text("hello", encoding="utf-8")
    assert is_system_file(f) is False


@pytest.mark.skipif(sys.platform != "win32", reason="Windows FILE_ATTRIBUTE_SYSTEM only")
def test_is_system_file_returns_true_for_system_file(tmp_path: Path) -> None:
    f = tmp_path / "sysfile.txt"
    f.write_text("hello", encoding="utf-8")
    file_attribute_system = 0x4
    ctypes.windll.kernel32.SetFileAttributesW(str(f), file_attribute_system)  # type: ignore[attr-defined]
    assert is_system_file(f) is True


# ---------------------------------------------------------------------------
# open_in_explorer
# ---------------------------------------------------------------------------


def test_open_in_explorer_calls_subprocess_on_windows(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "platform", "win32")
    mock_popen: MagicMock = MagicMock()
    with patch("backend.core.windows_utils.subprocess") as mock_sub:
        mock_sub.Popen = mock_popen
        open_in_explorer(tmp_path)
    mock_popen.assert_called_once_with(["explorer.exe", f"/select,{tmp_path}"])


def test_open_in_explorer_does_nothing_on_non_windows(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "platform", "linux")
    with patch("backend.core.windows_utils.subprocess") as mock_sub:
        open_in_explorer(tmp_path)
    mock_sub.Popen.assert_not_called()
