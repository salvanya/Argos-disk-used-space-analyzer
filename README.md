# Argos

> A local-first, privacy-respecting disk space visualizer for Windows.
> Beautifully designed. Runs in your browser. Powered by Python.
>
> *Named after Argos Panoptes, the hundred-eyed guardian of Greek myth — the app that sees everything on your disk.*

**Status:** 🚧 In development

## What it does

Argos helps you find what's eating your disk space. Point it at a folder, and you get:

- A precise, IDE-style folder tree with sizes and parent-relative percentages.
- A detailed middle panel showing folders and files with sortable, groupable columns.
- An insights panel with a pie chart breakdown and the heaviest items at a glance.
- An Obsidian-style **3D graph view** of your entire folder structure, with spheres sized by disk usage.

All local. No cloud. No telemetry. Your filesystem stays yours.

## Requirements

- Windows 10 or 11
- Python ≥ 3.11
- Node.js ≥ 20 (only needed to build the frontend; not required at runtime once built)

## Quick start

```bash
# Clone
git clone <repo-url> argos
cd argos

# Install Python deps
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"

# Build the frontend (one-time or after frontend changes)
cd frontend
npm install
npm run build
cd ..

# Run
python main.py
```

Your default browser opens at `http://127.0.0.1:<random-port>` with a one-time auth token.

## Running with administrator privileges

Some folders require elevation to scan (e.g., other users' profiles, `C:\Windows\System32`).

**Option A** — start an elevated terminal, then run `python main.py`.
**Option B** — launch normally; when you hit a protected folder, click **Relaunch as administrator** in the app.

Argos always shows a shield icon when running elevated, so you know.

## Project layout

See [`CLAUDE.md`](./CLAUDE.md) section 4 for the full project structure.

## Development

This project is developed with [Claude Code](https://www.claude.com/product/claude-code) using a Spec-Driven Development workflow. The `.claude/` directory contains skills and slash commands that enforce the project's engineering standards.

Key commands while developing:
- `/plan <feature>` — draft an implementation plan before coding.
- `/spec <feature>` — write a formal spec.
- `/tdd <component>` — start a strict red/green/refactor cycle.
- `/design-review` — audit a UI change against the design system.

Run tests:
```bash
pytest                       # all tests
pytest --cov=backend         # with coverage
ruff check .                 # lint
ruff format .                # format
mypy backend                 # typecheck
```

## Design

Argos draws aesthetic inspiration from Raycast, Arc Browser, and Apple Vision Pro — glassmorphism, mesh gradients, precise typography, thoughtful motion. See [`CLAUDE.md`](./CLAUDE.md) section 5 for the full design system.

## License

TBD — personal project, license to be decided before any public release.

## Contributing

This is a personal project. Issues and PRs welcome once the initial milestones are complete.
