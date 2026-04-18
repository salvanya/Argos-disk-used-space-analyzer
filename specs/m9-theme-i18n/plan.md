# Plan: M9 — Theme Toggle + i18n (EN/ES)

## Architecture Overview

The state layer (appStore, localStorage persistence, i18n sync in App.tsx) and toggle
buttons in TopMenuBar are already fully wired. The work splits into two areas:

1. **Semantic color tokens** — extend tailwind.config.ts with CSS-variable-backed color
   utilities (`text-fg-primary`, `text-fg-secondary`, `text-fg-muted`, `bg-canvas-surface`,
   `border-canvas`). Replace hardcoded `text-white/XX` throughout components so light mode
   becomes readable without touching the CSS variable definitions.

2. **Home screen controls** — add theme + language toggles to the Header component so
   users can switch both preferences before entering the Explorer.

No state management changes. No backend changes. No new i18n keys.

## Files Affected

| File | Change |
|------|--------|
| `frontend/tailwind.config.ts` | Add `fg` and `canvas` color groups mapped to CSS vars |
| `frontend/src/styles/globals.css` | Add light-mode aurora opacity override |
| `frontend/src/components/layout/Header.tsx` | Semantic colors + theme/lang toggle buttons |
| `frontend/src/pages/Home.tsx` | Replace hardcoded `text-white/XX` with semantic tokens |
| `frontend/src/components/explorer/TopMenuBar.tsx` | Replace `text-white/XX` / `bg-white/XX` in MenuButton with semantic tokens |
| `frontend/src/components/layout/__tests__/Header.test.tsx` | NEW — theme/lang toggle tests |

## Data Model Changes
None.

## API Surface
None.

## Semantic Color Token Mapping

CSS variables (globals.css) already define:
```
--text-primary   rgba(255 255 255 / 0.95)  →  .light: rgba(0 0 0 / 0.9)
--text-secondary rgba(255 255 255 / 0.55)  →  .light: rgba(0 0 0 / 0.5)
--text-muted     rgba(255 255 255 / 0.30)  →  .light: rgba(0 0 0 / 0.3)
--bg-surface     rgba(255 255 255 / 0.08)  →  .light: rgba(255 255 255 / 0.6)
--bg-surface-border rgba(255 255 255 / 0.1) →  .light: rgba(0 0 0 / 0.08)
```

Tailwind extensions (new):
```
fg.primary   → var(--text-primary)       → class: text-fg-primary
fg.secondary → var(--text-secondary)     → class: text-fg-secondary
fg.muted     → var(--text-muted)         → class: text-fg-muted
canvas.surface → var(--bg-surface)       → class: bg-canvas-surface
canvas.border  → var(--bg-surface-border)→ class: border-canvas-border
```

Note: CSS variable colors don't support Tailwind's `/XX` opacity modifier because the
opacity is baked into the variable value. All replacements use the semantic token directly.

For interactive states in MenuButton where opacity-based hover is needed, use a
light-mode-safe alternative: `hover:bg-black/5` for light and `hover:bg-white/10` for dark.
Since we're on the `.light`/no-class strategy (not Tailwind `dark:`), use CSS variable
for the hover or accept a shared value. The simplest safe approach: `hover:bg-fg-muted/20`
won't work — instead use a fixed low-opacity value that's subtle in both modes:
`hover:bg-black/5 dark:hover:bg-white/10`. BUT `tailwind.config` has `darkMode: "class"`
and the html class is `class="dark"` always (light mode ADDS `.light` on top of it).
So `dark:` prefix always applies. Instead of dark: strategy, use CSS custom property for
hover state OR add a separate `hovered-surface` CSS variable.

Simplest approach: add `--bg-hover: rgba(255 255 255 / 0.08)` (dark) /
`rgba(0 0 0 / 0.05)` (light) to globals.css, then add `canvas.hover` token.

## Testing Strategy

### Unit tests (new file: Header.test.tsx)
- Header renders theme toggle button (aria-label matches i18n key)
- Header renders language toggle button
- Clicking theme toggle calls appStore.setTheme and toggles `.light` on `<html>`
- Clicking language toggle updates appStore.locale to "es", back to "en"

### Existing tests (verify pass unchanged)
- TopMenuBar.test.tsx — theme/language toggle tests already exist and pass

### Manual verification
1. Start dev server (`python main.py` or Vite directly)
2. Open Home, toggle to light mode → all text readable
3. Toggle to Spanish → all Home strings in Spanish
4. Navigate to Explorer → Explorer also in light + Spanish
5. Reload → preferences restored
6. Toggle back to dark → identical to pre-M9 appearance

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Replacing `text-white/XX` breaks dark mode | Add semantic tokens that map to same dark values; test dark mode visually before commit |
| CSS variable colors can't use `/XX` opacity modifier | Bake opacity into variable values (already done); never use `text-fg-primary/50` |
| `dark:` Tailwind prefix doesn't work as expected (html always has `class="dark"`) | Avoid `dark:` prefix; use CSS variables and `.light` class overrides only |
| Aurora too bright in light mode | Add `.light .aurora-orb { opacity: 0.04 }` override in globals.css |
| MenuButton hover invisible in light mode | Add `--bg-hover` CSS variable with per-mode values |

## Rollback Plan
All changes are frontend-only, no DB/API impact. `git revert` is sufficient.
If semantic token rename causes issues, the old `text-white/XX` classes can be restored
from git diff in minutes.
