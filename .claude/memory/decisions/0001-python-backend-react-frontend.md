# Decision 0001: Python (FastAPI) + React Frontend Instead of Pure-Python UI

Status: accepted
Date: 2026-04-16

## Context

The application needs to run locally on Windows, launched via `python main.py`, with no executable bundling. It must deliver:
- A modern UI (glassmorphism, mesh gradients, Raycast/Arc/Vision Pro aesthetic).
- An Obsidian-style 3D force-directed graph of the filesystem.
- Precise control over Windows-specific filesystem behavior (symlinks, junctions, permissions).

## Decision

Use a two-tier architecture:
- **Backend**: Python 3.11+ with FastAPI + Uvicorn, serving a REST/WebSocket API.
- **Frontend**: React 18 + TypeScript + Vite, built to static assets served by the backend.

The app binds to `127.0.0.1`, auto-opens the browser, and behaves like a desktop app while being a web app internally.

## Alternatives Considered

- **Streamlit** — rejected. Cannot deliver the target aesthetic or the 3D graph at acceptable quality; every screen looks Streamlit-ish.
- **NiceGUI / Reflex** — rejected. Better than Streamlit but still constrained; 3D graph integration is awkward, glassmorphism requires fighting the framework.
- **PyQt / PySide** — rejected. Modern-looking Qt is possible but requires enormous effort; 3D graph via Qt3D is heavier than Three.js; deployment complexity rises.
- **Electron + Python backend** — rejected. Adds a massive Node runtime footprint; user explicitly wanted "just `python main.py`".
- **Tauri + Python sidecar** — rejected. Would require a compiled binary, against user constraint.
- **Flask + Jinja + vanilla JS** — rejected. Possible but much harder to get the TypeScript/component/animation ergonomics needed for this UI bar.

## Consequences

**Positive**
- Full access to the modern web frontend ecosystem (Three.js, Framer Motion, Tailwind).
- Python gets to do what it's best at: filesystem traversal, OS integration.
- Runs anywhere Python and a browser run; no native binary per platform.
- Clear separation of concerns; testable layers.

**Negative**
- Two toolchains (Python + Node) during development. Mitigated by the fact that production runtime is Python-only (Node only needed once to build the frontend).
- Frontend must be re-built after changes (`npm run build`). Mitigated with a dev mode that proxies Vite.
- IPC is over HTTP/WebSocket rather than direct — slightly less efficient, but disk scanning is I/O-bound, not IPC-bound, so this doesn't bottleneck.

## Follow-ups

- Benchmark scanner performance in M1. If Python scan is too slow on real-world disks (>500GB, >1M files), revisit with a `pyo3`-compiled Rust extension or multiprocessing.
- Document the dev workflow for frontend changes in README once M0 is complete.
