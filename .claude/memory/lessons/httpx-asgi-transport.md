# Lesson: httpx `app=` Shortcut Is Deprecated — Use ASGITransport

## Symptom
Tests fail at setup with `DeprecationWarning: The 'app' shortcut is now deprecated.`
and pytest's `filterwarnings = ["error"]` converts it to a hard error.

## Root Cause
Newer httpx (≥ 0.27) removed the `app=` convenience kwarg on `AsyncClient`.
The project's `pyproject.toml` has `filterwarnings = ["error"]`, so the deprecation
warning becomes an exception that kills fixture setup before any test runs.

## Fix / Workaround
Always use the explicit transport style in test fixtures:

```python
from httpx import ASGITransport
import httpx

async with httpx.AsyncClient(
    transport=ASGITransport(app=app),
    base_url="http://testserver",
) as client:
    yield client
```

This is the canonical pattern for all future API integration tests.

## How to Recognize It Next Time
- Error message contains `DeprecationWarning: The 'app' shortcut is now deprecated`.
- Appears in `conftest.py` fixture setup, not inside a test body.
- Only triggered when `filterwarnings = ["error"]` is active (our default).
