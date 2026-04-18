---
name: send2trash import alias for patching
description: How to import send2trash so it can be easily patched in tests
type: feedback
---

Import the `send2trash` function directly with `from send2trash import send2trash` so tests can patch `backend.api.filesystem.send2trash`. If imported as `import send2trash` (module), tests must patch `backend.api.filesystem.send2trash.send2trash` (one level deeper), which is confusing.

**Why:** Caught during M8 — mock assertion showed `Calls: [call.send2trash('...')]` instead of `call('...')`, revealing the module vs function import mismatch.

**How to apply:** Whenever using a third-party function that will need test-mocking, import the function directly rather than the module.
