# Current State — 2026-04-16

## In Progress
Nothing — M2 just completed and pushed.

## Last Completed
- Commit e52bf59: M2 API layer (HTTP + WebSocket scan endpoints, token auth, 18 tests, 94.1% cov)
- Commit 21a8cff: ruff formatting fixes + session memory files

## Next Step
Start M3 — Home screen (React frontend). Run `/plan M3 home screen` first.
Key constraints:
- Vite + React 18 + TypeScript scaffold under `frontend/`
- Folder picker → POST to WS /ws/scan for progress, then navigate to Explorer
- Recent folders list via GET /api/scans → list[ScanSummary]
- Admin detection: add minimal GET /api/system/info endpoint (pywin32 IsUserAnAdmin)
- Glassmorphism + aurora gradient (dark-first, see CLAUDE.md §5)

## Open Questions
- Admin endpoint in M3 or defer to M12? (Recommend: minimal endpoint in M3 so shield
  icon can be shown; full UAC relaunch flow deferred to M12.)

## Files Worth Reloading Next Session
- backend/api/scan.py — WS /ws/scan, GET /api/scans, GET/DELETE /api/scan/{root_b64}
- backend/api/dependencies.py — verify_token, get_cache
- backend/core/models.py — ScanSummary, WsProgressMessage, WsCompleteMessage, WsErrorMessage
- specs/m2-api-layer/plan.md — API surface and auth decisions
