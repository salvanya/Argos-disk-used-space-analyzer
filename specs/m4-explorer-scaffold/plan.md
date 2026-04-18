# Plan: M4 — Explorer Screen Scaffold

## Architecture Overview
The Explorer page replaces the current placeholder in `frontend/src/pages/Explorer.tsx`. It renders a full-height flex layout: a `TopMenuBar` component across the top, then three glass-panel columns below. A new `useExplorerStore` (zustand) owns UI toggles (theme, language, hidden-files, symlinks, view-mode). A route guard HOC `RequireScan` wraps Explorer and redirects to `/` if `useScanStore.result` is null. Theme and language are persisted to `localStorage` and hydrated on boot in `App.tsx`.

## Files Affected

### New files
- `frontend/src/pages/Explorer.tsx` — replace placeholder with full layout
- `frontend/src/components/explorer/TopMenuBar.tsx` — top menu bar
- `frontend/src/components/explorer/columns/FolderTreePanel.tsx` — left column shell
- `frontend/src/components/explorer/columns/ContentsPanel.tsx` — middle column shell
- `frontend/src/components/explorer/columns/InsightsPanel.tsx` — right column shell
- `frontend/src/components/explorer/RequireScan.tsx` — route guard (redirect if no scan result)
- `frontend/src/stores/explorerStore.ts` — zustand store for UI toggles
- `frontend/src/i18n/en.json` — new keys for explorer
- `frontend/src/i18n/es.json` — Spanish translations

### Modified files
- `frontend/src/App.tsx` — hydrate theme + locale from localStorage on boot
- `frontend/src/styles/globals.css` — no changes expected; `.light` class already defined

### Test files (new)
- `frontend/src/components/explorer/__tests__/RequireScan.test.tsx`
- `frontend/src/components/explorer/__tests__/TopMenuBar.test.tsx`
- `frontend/src/stores/__tests__/explorerStore.test.ts`

## Data Model Changes
No backend changes. New zustand store shape:

```typescript
interface ExplorerState {
  viewMode: "columns" | "3d";
  showHidden: boolean;
  followSymlinks: boolean;
  setViewMode: (mode: "columns" | "3d") => void;
  toggleHidden: () => void;
  toggleSymlinks: () => void;
}
```

Theme and locale are NOT in explorerStore — they live in `appStore` (extending it):
```typescript
// additions to appStore
theme: "dark" | "light";
locale: "en" | "es";
setTheme: (t: "dark" | "light") => void;
setLocale: (l: "en" | "es") => void;
```

## API Surface
No new backend endpoints. The rescan button reuses the existing WS connection (`connectScanWs`) and `useScanStore` actions already available.

## Testing Strategy

### Unit tests (Vitest + React Testing Library)
- `RequireScan.test.tsx`:
  - Renders children when `result !== null`.
  - Redirects to `/` when `result === null`.
- `TopMenuBar.test.tsx`:
  - Back button navigates to `/`.
  - Theme toggle calls `setTheme` and updates `<html>` class.
  - Language toggle calls `setLocale` and switches i18n.
  - View-mode switcher updates `explorerStore.viewMode`.
  - Rescan button disabled when already scanning; calls `startScan` + `connectScanWs` when clicked.
- `explorerStore.test.ts`:
  - Initial state correct.
  - `toggleHidden`, `toggleSymlinks`, `setViewMode` all update state correctly.

### Manual verification
1. `python main.py` → scan a folder → confirm Explorer loads with three panels.
2. Toggle theme → `<html>` gains `.light`, colors shift.
3. Toggle language → labels switch EN↔ES.
4. Reload page → theme and locale persist.
5. Navigate to `/explorer` directly (no scan) → redirected to `/`.
6. Click Rescan → progress appears, Explorer re-populates when done.

## Risks & Mitigations
- **Risk:** `localStorage` hydration causes a flash of wrong theme on load.
  → **Mitigation:** Apply theme class synchronously in `index.html` `<script>` inline before React hydrates (one-liner: `document.documentElement.classList.toggle('light', localStorage.theme==='light')`).
- **Risk:** `appStore` grows too large by adding theme/locale.
  → **Mitigation:** Keep it focused; if it exceeds ~8 actions later, extract to a `uiStore`.
- **Risk:** Column proportions break on edge-case viewport widths.
  → **Mitigation:** Use `min-w-0` on all flex children and test at 1280px, 1440px, 1920px.

## Rollback Plan
`Explorer.tsx` currently holds a 14-line placeholder. Reverting the file and deleting the new component files is sufficient to undo M4 entirely. The `appStore` additions (theme/locale) are additive and don't break existing consumers.

## Column Proportions
```
┌─────────────────────────────────────────────────────┐
│  TopMenuBar (full width, ~52px tall)                │
├───────────┬──────────────────────────┬──────────────┤
│ Folders   │ Contents                 │ Insights     │
│ ~20% / min│ flex-1 (fills remaining) │ ~320px fixed │
│ 240px     │                          │              │
└───────────┴──────────────────────────┴──────────────┘
```
Left: `w-60` (240px) + `flex-shrink-0`. Right: `w-80` (320px) + `flex-shrink-0`. Middle: `flex-1 min-w-0`.
