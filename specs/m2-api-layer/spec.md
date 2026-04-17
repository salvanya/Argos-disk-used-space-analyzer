# Spec: M2 — API Layer

## Problem
The scanner core (M1) has no network interface. The React frontend cannot trigger scans,
receive progress updates, or query cached results. Without an API layer, M1 is unusable
from the browser.

## Goals
- Expose scan operations over HTTP/WebSocket so the frontend can trigger, monitor, and retrieve scans.
- Stream scan progress in real-time via WebSocket (node count updates).
- Return scan results from cache when available; force-rescan when requested.
- Protect all scan/filesystem endpoints with a per-launch auth token.
- Keep the server bound exclusively to 127.0.0.1.

## Non-Goals
- Frontend implementation (M3+).
- Filesystem mutation endpoints (delete, open-in-explorer) — those are M8.
- Admin/UAC detection endpoint — deferred to M12.
- Pagination of large scan trees.

## User Stories
- As the frontend, I want to start a scan over WebSocket and receive progress ticks so the
  user sees a live counter while waiting.
- As the frontend, I want to GET a cached result without re-scanning so navigation is instant.
- As the frontend, I want to DELETE a cached scan so the user can force a fresh scan.
- As the frontend, I want to LIST all cached scans so the home screen can show recent folders.

## Acceptance Criteria

**Auth**
- Given a request with a missing or wrong token, when any scan endpoint is called,
  then the server returns 401.
- Given the correct token in `X-Argos-Token`, when any scan endpoint is called,
  then it succeeds.
- Given no token, when `/api/health` is called, then it returns 200 (health is exempt).

**Cache read (GET /api/scan/{root_b64})**
- Given a root that has a cached result, when GET is called with correct token,
  then the server returns 200 with the full ScanResult JSON.
- Given a root with no cache entry, then the server returns 404.
- Given a malformed base64 root_b64, then the server returns 422.

**Cache list (GET /api/scans)**
- Given two cached scans, when GET /api/scans is called, then both appear in the response
  ordered by most-recently-scanned first.

**Cache eviction (DELETE /api/scan/{root_b64})**
- Given a cached root, when DELETE is called, then the cache entry is removed and 204 is returned.
- Given a non-existent root, when DELETE is called, then 204 is still returned (idempotent).

**WebSocket scan (WS /ws/scan)**
- Given a valid root path and options in the first WS message, the scan runs in a thread pool
  (does not block the event loop) and progress messages (`{type: "progress", node_count: N}`)
  are streamed back.
- When the scan completes, a single `{type: "complete", result: {...}}` message is sent and
  the result is persisted to the cache.
- When the scan fails (e.g. root does not exist), a `{type: "error", message: "..."}` message
  is sent.
- Given `force_rescan: false` and a cached result, the WebSocket immediately sends
  `{type: "complete", result: {...}}` without re-scanning.
- Given a missing or invalid token in the first message, the WS server closes with code 4401.

## Open Questions
None — all resolved by decisions made during M1 planning (see decisions/0003).
