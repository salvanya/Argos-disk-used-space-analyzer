# Tasks: M9 — Theme Toggle + i18n (EN/ES)

## Phase 1 — Tests (Red)

- [ ] Write `Header.test.tsx` — renders theme toggle button
- [ ] Write `Header.test.tsx` — renders language toggle button  
- [ ] Write `Header.test.tsx` — clicking theme toggle switches dark→light (appStore + DOM class)
- [ ] Write `Header.test.tsx` — clicking theme toggle switches light→dark
- [ ] Write `Header.test.tsx` — clicking language toggle changes locale en→es

## Phase 2 — Implementation (Green)

- [ ] `tailwind.config.ts` — add `fg` color group (primary, secondary, muted)
- [ ] `tailwind.config.ts` — add `canvas` color group (surface, border, hover)
- [ ] `globals.css` — add `--bg-hover` CSS variable (dark + .light override)
- [ ] `globals.css` — add `.light .aurora-orb { opacity: 0.04 }` override
- [ ] `Header.tsx` — replace `text-white/90`, `/30`, `/25` with semantic tokens
- [ ] `Header.tsx` — add theme toggle button (Sun/Moon icon, calls setTheme)
- [ ] `Header.tsx` — add language toggle button (Languages icon + locale label, calls setLocale + i18n.changeLanguage)
- [ ] `Home.tsx` — replace `text-white/90`, `text-white/40`, `text-white/25` with semantic tokens
- [ ] `TopMenuBar.tsx` — replace `text-white/60`, `hover:bg-white/10`, `hover:text-white/90`, `bg-white/15`, `border-white/10` in MenuButton with semantic tokens

## Phase 3 — Refactor

- [ ] Verify no remaining `text-white/` or `bg-white/` in components (grep check)
- [ ] Ensure MenuButton active state still uses accent correctly in light mode

## Phase 4 — Polish & Verify

- [ ] Run `npm run test` — all tests pass (127+ frontend)
- [ ] Run `npm run typecheck` — no TS errors
- [ ] Manual: light mode Home looks premium (readable, aurora visible)
- [ ] Manual: light mode Explorer looks premium
- [ ] Manual: dark mode unchanged
- [ ] Manual: ES locale shows correct strings on both screens
- [ ] Manual: reload preserves theme + locale
- [ ] Conventional commit: `feat(m9-theme-i18n): light mode + home controls (see specs/m9-theme-i18n)`
