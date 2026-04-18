---
name: tkinter lazy import with noqa:PLC0415
description: Optional stdlib imports inside functions to catch ImportError must use noqa:PLC0415 to pass ruff
type: feedback
---

When an import is intentionally deferred inside a function body (to catch `ImportError` gracefully at call time), ruff rule PLC0415 flags it as "import should be at top-level."

Fix: add `# noqa: PLC0415` on the import line. Do NOT move the import to top-level — that defeats the purpose of lazy loading for optional deps.

**Why:** `tkinter` is stdlib but absent in some minimal Python installs (e.g. headless servers). The folder-picker endpoint catches `ImportError` and returns `{"path": null}` instead of crashing.

**How to apply:** Any time a stdlib or third-party import is inside a function specifically to handle `ImportError` or `ImportWarning`, add the noqa comment rather than restructuring.
