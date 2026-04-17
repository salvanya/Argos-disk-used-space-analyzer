# Lesson: Initialize `app.state` in `create_app()`, Not in the ASGI Lifespan

## Symptom
Test fixtures that access `app.state.cache` (or any app state) raise:
`AttributeError: 'State' object has no attribute 'cache'`

The fixture resolves before `httpx.AsyncClient.__aenter__` fires the ASGI
lifespan startup event.

## Root Cause
Pytest resolves fixtures in dependency order. If fixture A depends only on `app`
and fixture B (`authed_client`) triggers the ASGI startup, pytest may call A
before B enters its context manager — so the lifespan has not run yet.

## Fix / Workaround
Initialize all `app.state` values **inside `create_app()`**, not inside the
`@asynccontextmanager` lifespan:

```python
def create_app() -> FastAPI:
    settings = Settings()          # read env vars fresh on each call
    app = FastAPI(...)
    app.state.auth_token = secrets.token_urlsafe(32)
    app.state.cache = ScanCache(Path(settings.cache_db))
    ...
    return app
```

The lifespan can still do logging (startup/shutdown), but must not be the sole
place where state is set.

## Side Effect
Call `Settings()` directly in `create_app()` (not via `@lru_cache` `get_settings()`)
so each test's `ARGOS_*` env-var overrides are picked up on each call rather than
being frozen by the cache from the first test.

## How to Recognize It Next Time
- Error is `AttributeError: 'State' object has no attribute '<key>'`
- Only fails in tests; works in production where the server fully starts before
  any request arrives.
- Fixture that fails accesses `app.state` directly without going through a client.
