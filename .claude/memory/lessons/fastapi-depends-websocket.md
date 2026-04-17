# Lesson: FastAPI `Depends()` Does Not Work on WebSocket Endpoint Parameters

## Symptom
WebSocket endpoint with `cache: ScanCache = Depends(get_cache)` raises:
`TypeError: get_cache() missing 1 required positional argument: 'request'`

The error appears during request handling, not at startup.

## Root Cause
FastAPI resolves `Depends()` for HTTP endpoints by injecting a `Request` object.
For WebSocket endpoints the connection object is `WebSocket`, not `Request`, and
FastAPI does not automatically inject `Request` into WebSocket dependency functions
that declare it as a parameter.

## Fix / Workaround
Access app state directly inside the handler:

```python
@ws_router.websocket("/ws/scan")
async def ws_scan(websocket: WebSocket) -> None:
    cache: ScanCache = websocket.app.state.cache
```

For auth, read `websocket.app.state.auth_token` directly rather than using a
`Depends(verify_token)` on the WebSocket route.

## How to Recognize It Next Time
- Error is `TypeError: <dep_fn>() missing 1 required positional argument: 'request'`
- Happens only on WebSocket routes, not on HTTP routes using the same dependency.
- The dependency function signature includes `request: Request`.
