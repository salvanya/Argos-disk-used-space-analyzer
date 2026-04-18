# Lesson: Sort toggle breaks when sortKey is pre-initialised to a real value

## Symptom
Test "first click on Name header sorts by name asc" fails — the first click toggles to *desc* instead of activating asc.

## Root cause
When `sortKey` is initialised to `"name"` and `sortDir` to `"asc"`, clicking the Name header hits the "same column → toggle direction" branch and goes name/desc. The test expects first click to mean "activate asc", not "toggle from current".

## Fix / workaround
Initialise `sortKey` as `null` (no active sort). In `handleSortClick`:
```ts
const [sortKey, setSortKey] = useState<SortKey | null>(null);

function handleSortClick(col: SortKey) {
  if (sortKey !== col) {
    // Activating a new column — apply its natural default direction
    setSortKey(col);
    setSortDir(col === "size" ? "desc" : "asc");
  } else {
    // Same column — toggle
    setSortDir(prev => prev === "asc" ? "desc" : "asc");
  }
}
```
Items are passed through `sortItems` only when `sortKey !== null`, preserving original scan order by default.

## How to recognise it next time
Test says "first click sorts asc" but gets "desc". Cause: `sortKey` is already set to that column at init, so first click is treated as a toggle rather than an activation.
