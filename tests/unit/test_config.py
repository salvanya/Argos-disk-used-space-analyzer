"""Unit tests for backend.config.Settings."""

from __future__ import annotations

import pytest
from backend.config import Settings
from pydantic import ValidationError


def test_default_host_is_127001() -> None:
    settings = Settings()
    assert settings.host == "127.0.0.1"


def test_host_cannot_be_0000() -> None:
    """Security invariant: binding to 0.0.0.0 is never allowed."""
    with pytest.raises(ValidationError):
        Settings(host="0.0.0.0")


def test_host_cannot_be_empty() -> None:
    with pytest.raises(ValidationError):
        Settings(host="")


def test_log_level_defaults_to_info() -> None:
    settings = Settings()
    assert settings.log_level == "INFO"


def test_port_defaults_to_zero() -> None:
    """Port 0 means OS picks a free port."""
    settings = Settings()
    assert settings.port == 0


def test_auto_open_browser_defaults_to_true() -> None:
    settings = Settings()
    assert settings.auto_open_browser is True


def test_include_hidden_defaults_to_false() -> None:
    settings = Settings()
    assert settings.include_hidden is False
