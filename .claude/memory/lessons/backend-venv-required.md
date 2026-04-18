# Lesson: Backend tests require project venv, not system Python

## Symptom
`python -m pytest` fails with `INTERNALERROR pytest.PytestConfigWarning: Unknown config option: asyncio_mode` (5 errors, 0 tests collected).

## Root cause
Windows system Python (Anaconda) doesn't have `pytest-asyncio` installed, but `pyproject.toml` sets `asyncio_mode = "auto"` under `[tool.pytest.ini_options]`. Without the plugin, pytest rejects the unknown option and refuses to collect.

## Fix
Use the project venv, not system Python:
```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -e ".[dev]"
.venv/Scripts/python.exe -m pytest -q
```
`.venv/` is gitignored. Expect 93 passed + 4 skipped (symlink tests skip without Developer Mode / admin).

## How to recognize it next time
Any `Unknown config option` INTERNALERROR from pytest on this repo = wrong interpreter. Never `pip install` globally; always activate `.venv` or call `.venv/Scripts/python.exe` directly.
