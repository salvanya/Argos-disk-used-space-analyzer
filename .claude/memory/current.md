## In Progress
None. M12 shipped.

## Last Completed
- WS1: `feat(backend): scanner exclusions (fnmatch globs)` — 650ae40
- WS2: `feat(backend): bulk cache clear endpoint` — aea953d
- WS3: `feat(backend): relaunch-admin endpoint` — ad60801
- WS4: `feat(frontend): admin badge + relaunch button`
- WS5: `feat(frontend): settings drawer — scan options, exclusions, cache`
- Backend 111 pass / 4 skipped (symlink tests on Windows); Frontend 197/197; tsc -b clean; vite build clean.

## Next Step
Project milestones complete (M0–M12 per CLAUDE.md §10). Candidate follow-ups:
- Lazy-load InsightsPanel (Recharts) to drop main bundle below 500 KB.
- Real-world scan benchmark on a 500k+ file tree; decide whether multiprocessing is warranted.
- Packaging story beyond `python main.py` (explicit out-of-scope per §11 but may revisit).

## Open Questions
- None blocking.

## Files Worth Reloading Next Session
- `specs/m12-admin-settings/` — spec + plan reference
- `frontend/src/components/explorer/settings/` — drawer + sections
- `backend/api/system.py` — relaunch endpoint with threading.Timer shutdown
- CLAUDE.md §10 (milestones) — all shipped
