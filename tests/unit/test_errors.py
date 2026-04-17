"""Unit tests for backend.core.errors."""

from __future__ import annotations

import pytest

from backend.core.errors import (
    ArgosError,
    AuthError,
    CacheError,
    ConfigurationError,
    FilesystemError,
    ScanError,
)


def test_all_exceptions_derive_from_argos_error() -> None:
    for exc_class in (ConfigurationError, ScanError, CacheError, FilesystemError, AuthError):
        err = exc_class("test message")
        assert isinstance(err, ArgosError)


def test_argos_error_can_be_caught_as_exception() -> None:
    with pytest.raises(ArgosError):
        raise ScanError("scan failed")


def test_exception_message_is_preserved() -> None:
    err = CacheError("db locked")
    assert str(err) == "db locked"
