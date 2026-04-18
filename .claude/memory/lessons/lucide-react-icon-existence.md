# Lesson: lucide-react Icons May Not Exist

## Symptom
React crashes with "Element type is invalid: expected a string or function but got undefined" inside a component that imports from `lucide-react`.

## Root Cause
`lucide-react` renames/removes icons between releases. The installed version (`^1.8.0`) does not export `LayoutColumns` — only `Columns2`, `Columns3`, `Columns4`, etc.

## Fix / workaround
Before using a lucide icon by name, verify it exists:
```
node -e "const l = require('./node_modules/lucide-react'); console.log(typeof l.IconName)"
```
Substitute with the nearest available variant if `undefined`.

## How to recognize it next time
The error points to a JSX line inside a component. The icon import is `undefined` — React can't render it. Always verify icon names against the installed version, not the docs.
