"""Custom exception hierarchy for Argos.

All exceptions raised by backend code should derive from ArgosError so callers
can catch at the right level of specificity.
"""

from __future__ import annotations


class ArgosError(Exception):
    """Base class for all Argos application errors."""


class ConfigurationError(ArgosError):
    """Raised when the application configuration is invalid."""


class ScanError(ArgosError):
    """Raised when a filesystem scan fails irrecoverably."""


class CacheError(ArgosError):
    """Raised when the SQLite scan cache cannot be read or written."""


class FilesystemError(ArgosError):
    """Raised when a user-requested filesystem operation fails (delete, open, etc.)."""


class AuthError(ArgosError):
    """Raised when a request carries an invalid or missing auth token."""
