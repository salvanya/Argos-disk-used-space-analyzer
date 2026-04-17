---
description: Run the scanner against a fixture directory tree and verify output
argument-hint: [optional: path to alternative fixture]
---

Run the scanner against a test fixture and verify its behavior.

Steps:

1. If `$ARGUMENTS` is provided, use that path. Otherwise use the default fixture builder in `tests/fixtures/`.
2. Build (or verify) a representative fixture tree including:
   - Nested folders 3+ levels deep
   - A symlink or junction (if on Windows)
   - A hidden file
   - A folder with zero-byte files
   - A folder the current user cannot read (if possible without admin)
   - At least one UTF-8 filename (e.g., `café.txt`, `文件.md`)
3. Run the scanner on that fixture.
4. Verify:
   - Symlinks are detected and NOT counted in totals.
   - Inaccessible folders are marked but don't crash the scan.
   - Hidden file visibility matches the config setting.
   - Percentages sum to ~100% at each level (tolerance 0.1%).
   - Cache is populated; second run is significantly faster.
5. Report results.
