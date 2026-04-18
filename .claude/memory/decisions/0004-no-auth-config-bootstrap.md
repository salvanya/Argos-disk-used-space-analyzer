---
name: No-auth /api/config bootstrap endpoint
description: Frontend gets the per-launch token from GET /api/config (no auth required) before calling any other endpoint
type: project
---

GET /api/config requires **no** X-Argos-Token header and returns `{"token": "<launch_token>"}`.
All other API endpoints require the token.

**Why:** The frontend has no way to know the token before the first request — it is generated fresh each `python main.py`. Baking it into the HTML at build time is impossible (built static file). Environment variable injection would require a non-standard launch flow. The no-auth bootstrap is the cleanest solution and is safe because the server binds to 127.0.0.1 only.

**How to apply:** Never add auth to `/api/config`. If adding new public endpoints in future, document explicitly why they are unauthenticated.
