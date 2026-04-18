# Spec: M9 — Theme Toggle + i18n (EN/ES)

## Problem
The theme and language toggles exist in the Explorer's TopMenuBar, and the i18n strings
are already keyed across all components. However:
1. Light mode looks broken — all components use hardcoded `text-white/XX` Tailwind classes
   that are invisible on a light background.
2. There is no way to change theme or language from the Home screen.

## Goals
- Light mode looks premium (glassmorphism on light background, readable text, subtle aurora).
- Dark mode is visually unchanged from current state.
- Theme preference persists across page reloads (already via localStorage).
- Language preference persists across page reloads (already via localStorage).
- Theme and language toggles are accessible from both Home and Explorer screens.
- All UI strings display correctly in Spanish when locale = "es".

## Non-Goals
- No new i18n string keys needed (en.json + es.json are complete through M8).
- No backend changes.
- No new third-party dependencies.
- Full pixel-perfect design system audit deferred to M11 polish.

## User Stories
- As a user on the Home screen, I want to switch to light mode before scanning, so my
  preference is set before entering the Explorer.
- As a user who prefers Spanish, I want to change the language from the Home screen so
  all subsequent text is in Spanish.
- As a user, I want both light and dark modes to feel premium and readable.

## Acceptance Criteria

**Theme:**
- Given dark mode, when I click the theme toggle on Home OR Explorer, the UI switches to
  light mode immediately.
- Given light mode, all text remains legible (no white-on-white).
- Given light mode, the aurora background orbs are visible (adjusted opacity/color).
- Given a page reload in light mode, the page loads in light mode without flash.

**Language:**
- Given locale = "en", when I click the language toggle on Home OR Explorer, all UI
  strings switch to Spanish.
- Given locale = "es", all visible strings match es.json values.
- Given a page reload with locale = "es", the page loads in Spanish.

**No regression:**
- Dark mode looks identical to pre-M9 state.
- All existing tests pass.

## Open Questions
None — all resolved by examining current code.
