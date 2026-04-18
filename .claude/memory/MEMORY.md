# Memory Index

## Decisions
- [0001: Python backend + React frontend](decisions/0001-python-backend-react-frontend.md) — Why FastAPI+React over pure-Python UI frameworks
- [0002: Never follow symlinks](decisions/0002-do-not-follow-symlinks.md) — Symlinks excluded from size totals, shown with icon
- [0003: Synchronous scanner](decisions/0003-synchronous-scanner.md) — asyncio walkdir benchmarked slower than sync os.walk on Windows
- [0004: No-auth config bootstrap](decisions/0004-no-auth-config-bootstrap.md) — App config (token) fetched once on mount, not baked into HTML

## Lessons
- [tanstack-virtual jsdom](lessons/tanstack-virtual-jsdom.md) — useVirtualizer renders nothing in jsdom; mock it in tests
- [lucide-react icon existence](lessons/lucide-react-icon-existence.md) — Verify icon names exist before using; lucide renames icons across versions
- [vitest i18next setup](lessons/vitest-i18next-setup.md) — i18next must be initialized in test-setup.ts; keys render verbatim in tests
- [tkinter lazy import](lessons/tkinter-lazy-import-noqa.md) — Import tkinter inside the function body to avoid headless CI failures
- [fastapi depends websocket](lessons/fastapi-depends-websocket.md) — FastAPI Depends() doesn't work on WebSocket routes; validate token manually
- [app state lifespan vs create_app](lessons/app-state-lifespan-vs-create-app.md) — Store app state on the FastAPI app instance via lifespan, not module globals
- [path stat monkeypatch](lessons/path-stat-monkeypatch.md) — Monkeypatching Path.stat requires patching on the module under test, not pathlib
- [mypy ctypes windll](lessons/mypy-ctypes-windll.md) — mypy can't resolve ctypes.windll attributes; use type: ignore sparingly
- [httpx asgi transport](lessons/httpx-asgi-transport.md) — Use httpx.AsyncClient(transport=ASGITransport(...)) for FastAPI integration tests
- [windows junction detection](lessons/windows-junction-detection.md) — os.path.ismount() detects junctions on Windows; is_symlink() misses them
