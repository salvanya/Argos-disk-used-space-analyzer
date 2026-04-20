# CLAUDE.md

> Primary guidance file for Claude Code working on this project.
> **Always read this file first.** When in doubt, re-read the relevant section before acting.

---

## 1. Project Overview

**Name:** Argos
**Purpose:** A local-first, personal desktop application to visualize and analyze disk space usage on Windows. The user runs out of disk space frequently and needs a powerful visual tool to identify heavy files and folders.

**Naming origin:** Argos Panoptes — the hundred-eyed giant of Greek mythology, the ever-watchful guardian. Fitting for an app whose purpose is to see everything on your disk.

**Core value proposition:** A local, privacy-respecting, beautifully designed disk space visualizer that runs in the browser while leveraging Python's filesystem capabilities — combining the best of modern web design with native-level filesystem access.

**Runtime model:** `python main.py` launches a local web server that opens the browser (or a PyWebView window) at `localhost:<port>`. No cloud, no executables, no installers.

---

## 2. Core Features (Product Scope)

### 2.1 Home Screen
- Simple landing page to select a folder from the local filesystem.
- Recent folders list (persisted locally).
- "Scan as administrator" toggle/button for elevated access.
- Indicator of whether the current process has admin privileges.

### 2.2 Main Application Screen

**Top Menu Bar:**
- Change scanned folder
- Theme toggle (light / dark)
- Language toggle (English / Spanish)
- Toggle: include hidden/system files
- View mode switcher (Columns view ↔ 3D Graph view)
- Settings panel (advanced scan options, exclusions, cache management)
- Rescan button (forces re-scan, bypasses cache)

**Three-Column Main Area:**

1. **Left Column — Folder Tree Navigator**
   - IDE-like folder-only tree (à la VS Code).
   - Expand/collapse hierarchically.
   - Each entry shows: folder name, size, and percentage **relative to its parent level**.
   - Example: root 100GB → children show 60%, 30%, 10%. Click 60GB folder → its children show 50%, 30%, 20% (relative to the 60GB parent).
   - Clicking a folder changes the focus in the middle column.

2. **Middle Column — Folder Contents**
   - Shows both files AND folders inside the currently focused folder.
   - Columns: name, size, % of parent, visual bar representing the %.
   - Sortable by: alphabetical, size (asc/desc).
   - Groupable by: type/extension.
   - Clicking a folder here changes focus (same as left column).
   - Right-click context menu per entry:
     - Open containing folder in Windows Explorer
     - Delete (move to Recycle Bin by default; Shift+Delete for permanent)
     - Copy path
     - Properties / Details

3. **Right Column — Insights Panel**
   - Pie chart: breakdown of current folder by direct children (files + folders).
   - Top N heaviest items (mix of files and folders) with visual bars.
   - Summary stats: total size, file count, folder count, largest file, deepest path.
   - File type breakdown (by extension/category).

### 2.3 3D Graph View Mode
- Obsidian-style force-directed 3D graph of the entire scanned tree.
- Spheres = nodes (folders and files).
- Sphere **radius proportional to size** (use log scale to keep tiny items visible).
- Distinct color per node type: folders vs files (and optionally per file category).
- Edges connect parents to children recursively — full hierarchy visible.
- Interactive: pan, zoom, rotate, click a sphere to focus/inspect, hover for tooltip (name, size, %).
- Smooth transitions and physics-based motion.

### 2.4 Non-Functional Requirements
- **Complete scan** (not lazy/progressive) — show progress indicator during scan.
- **Cached scans** in SQLite so re-opening a folder is fast; provide "rescan" to force refresh.
- **Bilingual UI** (ES/EN) from day one.
- **Inaccessible folders** marked clearly, never crash the scan.
- **Symlinks/junctions** shown with distinct icon (🔗), NOT followed, NOT counted in parent totals.

---

## 3. Technical Stack

### 3.1 Backend (Python)
- **Python ≥ 3.11** (for better typing + performance).
- **FastAPI** — async web framework, auto OpenAPI docs, excellent DX.
- **Uvicorn** — ASGI server.
- **SQLite** (via `sqlite3` stdlib or `aiosqlite`) — local cache for scan results.
- **Pydantic v2** — data models, validation.
- **send2trash** — cross-platform Recycle Bin deletion.
- **pywin32** (Windows-only) — for advanced filesystem ops, admin detection, UAC elevation.
- **pytest** + **pytest-asyncio** + **pytest-cov** — testing stack.
- **ruff** — linter + formatter (replaces black, isort, flake8).
- **mypy** — static type checking.

### 3.2 Frontend
- **Vite + React 18 + TypeScript** — modern, fast, typed.
- **TailwindCSS** + **shadcn/ui** — for base components (accessible, customizable).
- **Framer Motion** — animations and transitions (aurora gradients, page transitions).
- **Recharts** — pie charts, bar charts for the Insights panel.
- **react-force-graph-3d** (built on Three.js) — for the Obsidian-like 3D graph view.
- **zustand** — state management (simple, no boilerplate).
- **react-i18next** — i18n for EN/ES.
- **lucide-react** — icons.
- **Geist** or **Inter** — typography.

### 3.3 Build/Integration
- Frontend built to `static/` directory; FastAPI serves it.
- Single-command dev: `python main.py` starts backend; in dev mode also starts Vite with proxy.
- In production mode: backend serves pre-built frontend.

### 3.4 Why this stack?
- **FastAPI + React**: the 3D graph and glassmorphism UI effectively require modern web tech; pure-Python UI frameworks (Streamlit, NiceGUI) can't deliver the target aesthetic or the 3D graph quality.
- **TypeScript**: catches bugs at compile time, essential for a codebase of this size.
- **SQLite cache**: scanning a large disk is slow (minutes); cache is non-negotiable for UX.
- **send2trash + pywin32**: proper Windows integration for Recycle Bin and Explorer.

---

## 4. Project Structure

```
argos/
├── CLAUDE.md                    # This file
├── README.md                    # User-facing readme
├── main.py                      # Entry point — launches server + opens browser
├── pyproject.toml               # Python deps, ruff/mypy/pytest config
├── .gitignore
├── .env.example
│
├── .claude/                     # Claude Code configuration
│   ├── settings.json
│   ├── skills/                  # Project-specific skills
│   ├── commands/                # Slash commands
│   └── agents/                  # Subagent definitions
│
├── backend/
│   ├── __init__.py
│   ├── app.py                   # FastAPI app factory
│   ├── config.py                # Settings (pydantic-settings)
│   ├── api/                     # Route modules
│   │   ├── __init__.py
│   │   ├── scan.py              # Scan endpoints
│   │   ├── filesystem.py        # FS operations (delete, open in explorer)
│   │   └── settings.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── scanner.py           # The scanning engine
│   │   ├── cache.py             # SQLite cache layer
│   │   ├── models.py            # Pydantic models
│   │   ├── windows_utils.py     # Admin detection, UAC elevation, Explorer integration
│   │   └── errors.py
│   └── static/                  # Built frontend output
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   └── Explorer.tsx
│   │   ├── components/
│   │   │   ├── ui/              # shadcn components
│   │   │   ├── layout/
│   │   │   ├── tree/            # Left column
│   │   │   ├── table/           # Middle column
│   │   │   ├── insights/        # Right column
│   │   │   └── graph3d/         # 3D graph view
│   │   ├── hooks/
│   │   ├── stores/              # zustand stores
│   │   ├── lib/
│   │   ├── i18n/
│   │   │   ├── en.json
│   │   │   └── es.json
│   │   └── styles/
│   │       └── globals.css
│   └── public/
│
└── tests/
    ├── conftest.py
    ├── unit/
    │   ├── test_scanner.py
    │   ├── test_cache.py
    │   └── test_windows_utils.py
    ├── integration/
    │   └── test_api.py
    └── fixtures/
```

---

## 5. Design System

**North Star aesthetic:** Raycast + Arc Browser + Apple Vision Pro + glassmorphism + aurora/mesh gradients.
A dark-first, precise, calm, luxurious interface. Light mode must also feel premium, not an afterthought.

### 5.1 Core Principles
- **Clarity over decoration** — every visual element serves data comprehension.
- **Calm** — no loud colors unless flagging something (e.g., a huge file).
- **Precision** — crisp edges, perfect alignment, thoughtful spacing, variable-weight typography.
- **Depth through layers** — translucent panels, blurred backgrounds, subtle shadows.
- **Motion with purpose** — spring-based transitions, never gratuitous.

### 5.2 Visual Language
- **Backgrounds:** Deep neutrals (`#0a0a0b` dark / `#fafafa` light) with a subtle animated mesh-gradient aurora layer behind (very desaturated, low opacity).
- **Surfaces:** Glassmorphism panels — `backdrop-blur-xl` with ~8% white (dark mode) or ~60% white (light mode) + 1px subtle border.
- **Accents:** Cool spectrum — electric blue `#4f8bff`, violet `#8b5cf6`, cyan `#22d3ee`. Warm accents reserved for warnings/heavy-item highlights.
- **Typography:** Geist Sans for UI, Geist Mono for sizes/paths. Tight letter-spacing on headers, generous line-height on body.
- **Data colors:** Sequential viridis-like scale for the pie chart and bars. Categorical palette for file-type grouping.
- **Icons:** Lucide, thin stroke, monochrome with occasional accent tint.
- **Corner radii:** 12px base, 16px for large panels, 8px for inputs, full for pills.
- **Shadows:** Soft, multi-layer — not harsh. Use `shadow-[0_0_40px_-10px_rgba(79,139,255,0.15)]` for glows on active elements.

### 5.3 3D Graph Aesthetics
- Dark void background with subtle star field or gradient glow.
- Folder spheres: translucent cool gradient (blue→violet).
- File spheres: translucent warm gradient by category (or neutral gray for unknown).
- Edges: thin, low-opacity, slightly emissive.
- Hovered/focused node: outer glow ring and label.

> For detailed UI patterns, defer to the `frontend-design` skill.

---

## 6. Technical Rules & Constraints

### 6.1 Language
- **All code, comments, docstrings, commit messages, and technical docs: English.**
- The only exception: user-facing UI strings in `i18n/es.json`.

### 6.2 Testing — TDD is mandatory
- Write failing test → minimal implementation → refactor. **No production code without a failing test first.**
- Target ≥ 85% coverage on `backend/core/`.
- Frontend: Vitest + React Testing Library. Test components with user-interaction-focused tests (no implementation-detail tests).
- Integration tests cover the full scan flow on a fixture directory tree built in `conftest.py`.

### 6.3 Git Workflow
- **Work directly on `main`** — no feature branches for this personal project.
- **Conventional Commits** format: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`, `style:`.
- Commit early, commit often, small atomic commits.
- Never commit: `node_modules/`, `dist/`, `*.db`, `.env`, `__pycache__/`, `.venv/`.

### 6.4 Python Standards
- Ruff config: line length 100, select all sensible rules.
- Mypy strict mode on `backend/core/`.
- Type hints are mandatory on every function signature.
- Prefer `pathlib.Path` over `os.path`.
- Use `async`/`await` for I/O-bound scanning operations where it helps.
- Raise specific custom exceptions (in `core/errors.py`), never bare `Exception`.

### 6.5 Frontend Standards
- No `any` in TypeScript — if you need escape hatch, use `unknown` + narrowing.
- Components: named exports, PascalCase files matching component names.
- Props interfaces suffixed with `Props` (e.g., `FolderTreeProps`).
- No inline magic strings for i18n — always use `t("key.path")`.
- No inline styles except for dynamic values (e.g., sphere radius, bar width).
- Use `cn()` helper for conditional class names.

### 6.6 Filesystem Scanning Rules
- **Symlinks/junctions: never follow.** Detect via `path.is_symlink()` and `os.path.ismount()`. Mark in the data model; display with 🔗 icon; exclude from size totals.
- **Inaccessible folders: never crash.** Catch `PermissionError`, `OSError` — mark the node as `accessible=False`; display size as "—"; log (do not show stack trace to user).
- **Hidden/system files**: controlled by user setting. Default: excluded. On Windows, check `FILE_ATTRIBUTE_HIDDEN` and `FILE_ATTRIBUTE_SYSTEM` via `ctypes` or `pywin32`.
- **Admin privileges**: detect on startup using `ctypes.windll.shell32.IsUserAnAdmin()`. Store in app state. Expose via API. UI shows a shield icon when elevated. Offer "Relaunch as administrator" button using `ShellExecuteW` with `runas` verb.
- **Deletion**: always via `send2trash` by default. Permanent delete (`os.remove` / `shutil.rmtree`) only with explicit confirmation + shift-click. Log every deletion.

### 6.7 Performance Targets
- Scan should process ≥ 100k files per minute on a modern NVMe (benchmark during dev).
- UI should remain responsive during scan via WebSocket progress updates.
- Tree rendering: virtualized if > 500 visible nodes (use `@tanstack/react-virtual`).
- 3D graph: if > 5000 nodes, downsample or collapse deepest levels with a "expand" affordance.

### 6.8 Security / Safety
- The app binds to `127.0.0.1` ONLY, never `0.0.0.0`. Non-negotiable.
- A random token is generated per launch and required on all API calls (prevents CSRF from malicious localhost pages).
- Deletion endpoints require explicit confirmation payload (e.g., `{ "confirm": true, "path": "..." }`).
- Never log full file contents. Paths and sizes only.

---

## 7. How Claude Should Work on This Project

### 7.1 Before Starting Any Task
1. Re-read the relevant section of this file.
2. If the task touches scanning, filesystem, or Windows-specific behavior → read `backend/core/scanner.py` and `backend/core/windows_utils.py`.
3. If the task touches UI → read `frontend/src/styles/globals.css` and the relevant component directory.
4. **Check if a skill in `.claude/skills/` applies.** Several project-specific skills exist; use them.

### 7.2 Workflow Per Feature
1. **Understand** — restate the requirement in your own words.
2. **Plan** — sketch the approach; list the files you'll touch.
3. **Test first** — write the failing test(s).
4. **Implement** — minimal code to pass.
5. **Refactor** — improve without breaking tests.
6. **Verify** — run the full test suite + linter + typecheck.
7. **Commit** — conventional commit message.

### 7.3 When Stuck
- Don't guess. Ask the user for clarification or provide 2–3 approaches with trade-offs.
- If docs or APIs might have changed, search the web — do not rely on memory.

### 7.4 What to Optimize For
Order of priorities:
1. **Correctness** (doesn't crash, doesn't lose data, correct sizes).
2. **Safety** (doesn't delete the wrong thing).
3. **User experience** (fast, beautiful, intuitive).
4. **Code quality** (readable, tested, typed).
5. **Performance** (important but not if it compromises the above).

### 7.5 What NOT to Do
- ❌ Don't install new dependencies without asking first.
- ❌ Don't refactor untouched code "while you're in there".
- ❌ Don't suppress warnings or errors to make tests pass.
- ❌ Don't add features not explicitly requested.
- ❌ Don't generate placeholder/TODO implementations — either do it fully or stop and ask.
- ❌ Don't use `print` debugging in committed code — use Python's `logging`.
- ❌ Don't touch `main` branch protection? N/A — we work on main. But still no force-push rewriting history.

---

## 8. Skills Available in `.claude/skills/`

Project-specific and imported skills. See each skill's `SKILL.md` for details.

- **`spec-driven-development`** — for any new feature: specify → plan → implement → verify. Inspired by LIDR-academy/manual-SDD.
- **`lean-context`** — keep context windows tight; load only what's needed. Inspired by yvgude/lean-ctx.
- **`tdd-discipline`** — red/green/refactor workflow with guardrails. From obra/superpowers.
- **`debug-systematically`** — structured debugging protocol. From obra/superpowers.
- **`persistent-memory`** — save and reload session insights across sessions. Inspired by thedotmack/claude-mem.
- **`ui-ux-excellence`** — design-review protocol applied every time UI is touched. Inspired by nextlevelbuilder/ui-ux-pro-max-skill.
- **`frontend-design`** (Anthropic built-in) — production-grade frontend conventions.
- **`context-engineering`** — principles for structuring prompts, agents, and tools. Inspired by muratcankoylan/Agent-Skills-for-Context-Engineering.

---

## 9. Slash Commands Available in `.claude/commands/`

- `/plan <feature>` — produce a detailed implementation plan before touching code.
- `/spec <feature>` — write a formal spec into `specs/` following SDD.
- `/tdd <component>` — start a TDD cycle for a given component.
- `/design-review` — review a UI change against the design system.
- `/scan-test` — run the scanner against a fixture tree and verify output.
- `/memory-save` — persist important session context to `.claude/memory/`.
- `/memory-load` — load prior session context at the start of a new session.

---

## 10. Initial Milestones (Suggested Order)

1. **M0 — Scaffolding**: project structure, tooling (ruff, mypy, pytest, vite), hello-world end-to-end.
2. **M1 — Scanner core**: recursive scanner with symlink/permission handling + cache. Full TDD.
3. **M2 — API layer**: FastAPI endpoints, localhost binding, token auth, WebSocket progress.
4. **M3 — Home screen**: folder picker, recent folders, admin detection UI.
5. **M4 — Explorer screen scaffold**: three-column layout with glassmorphism + top menu.
6. **M5 — Left column**: folder tree with sizes and parent-relative percentages.
7. **M6 — Middle column**: file/folder table with sorting, grouping, right-click menu.
8. **M7 — Right column**: pie chart + top-N insights.
9. **M8 — Deletion + Explorer integration** (send2trash, open-in-explorer).
10. **M9 — i18n (EN/ES)** + theme toggle.
11. **M10 — 3D graph view**: react-force-graph-3d with proper scaling/colors.
12. **M11 — Polish**: animations, empty states, error states, accessibility pass.
13. **M12 — Admin relaunch flow** and advanced settings.
14. **M13 — UX refinements**: resizable columns, default size-desc sort, toolbar reorder, dark-mode group-by dropdown fix, footer with attribution + MIT license, 3D sphere radius proportional to size. Spec at `specs/m13-ux-refinements/spec.md`.
15. **M14 — Lazy / on-demand scanning** _(rolled back 2026-04-20)_: lazy per-folder scans shipped but caused poor UX (folder sizes appearing as "—" until each level was expanded). Rolled back to the recursive-scan + WebSocket-progress model described in §2 and §6. UX/UI polish from M14 (resizable columns, sort/group controls, 3D sphere scaling, etc.) is preserved. Spec preserved at `specs/m14-lazy-scanning/spec.md` for future reference; do not re-introduce without a clear UX plan for partial-size states.

---

## 11. Open Questions / Deferred Decisions

- **App icon / branding** — deferred until M11. The Argos name suggests eye/vision iconography; explore options during design pass.
- **Performance optimization via multiprocessing or Rust extension (pyo3)** — only if Python scanner turns out too slow on real-world large disks during M1 benchmarking.
- **Packaging as a single zipapp or PEX** — explicitly out of scope per user requirement ("no .exe, just `python main.py`").

---

**End of CLAUDE.md.** Keep this file in sync with reality: when rules change, update here first.
