---
name: ui-ux-excellence
description: Use this skill whenever touching the frontend — new components, layout changes, styling, animations, or interactions. Enforces the Raycast + Arc + Apple Vision Pro + glassmorphism aesthetic defined in CLAUDE.md. Inspired by nextlevelbuilder/ui-ux-pro-max-skill.
---

# UI/UX Excellence

## The Aesthetic Target
This project has an unusually high visual bar. Read this before writing any UI code.

**References (in priority order):**
1. **Raycast** — compact density, keyboard-first feel, premium dark theme.
2. **Arc Browser** — colorful glass, playful but restrained, modern gradients.
3. **Apple Vision Pro UI** — ultra-clean translucency, generous space around content, depth through blur.
4. **Linear** — precise typography, minimal chrome, strong information hierarchy.
5. **Vercel dashboard** — geometric, confident, dark-first, excellent data display.

## The Six Principles

### 1. Hierarchy before decoration
Before adding any gradient, blur, or shadow, ensure the base layout makes the primary information the most visually prominent thing. Typography weight, size, and color do most of the work. Effects come last.

### 2. Space is a feature
Generous padding. Never crowd. When in doubt, add more space. Compact does not mean cramped — Raycast is compact but has perfect rhythm.

### 3. Motion communicates
Every transition should answer "what changed?". Use spring physics (Framer Motion). Target durations: 150–250ms for UI feedback, 300–500ms for scene transitions. Never longer.

### 4. Depth through translucency
- Base layer: dark background + subtle mesh gradient (desaturated, 10% opacity).
- Content layer: glass panels — `backdrop-blur-xl bg-white/5 border border-white/10` (dark) or `bg-white/60 border border-black/5` (light).
- Overlays: heavier blur, higher opacity.
- Floating elements: soft multi-layer shadow, never hard.

### 5. Color with intent
- **Neutral scale** (grays) carries 80% of the UI.
- **Cool accent** (blue/violet/cyan) for primary actions and interactive elements.
- **Warm accent** (amber/red) ONLY for warnings, heavy-size highlights, or deletions.
- **Data colors**: viridis-like sequential for quantitative; categorical palette for qualitative (file types).
- Contrast ratio: minimum 4.5:1 for body text (WCAG AA). Check every color combo.

### 6. Typography is the product
- **Geist Sans** for UI text, **Geist Mono** for sizes/paths.
- **Line height**: 1.5 for body, 1.2 for headings.
- **Letter-spacing**: tighten headings (-0.02em), relax mono (+0.01em).
- **Weight hierarchy**: 400 body, 500 emphasis, 600 headings, 700 display. Avoid 800+.
- **Numeric tabular-nums** for all size columns so digits align.

## Component Design Protocol

For every new component:
1. **Purpose** — What single thing does it do? If you can't answer in one sentence, it does too much.
2. **States** — idle, hover, focus-visible, active, disabled, loading, error, empty. Design ALL of them.
3. **Responsiveness** — app is desktop-first but avoid assumptions; target ≥ 1024px, graceful down to 768px.
4. **Accessibility** — keyboard navigation, ARIA where needed, focus rings always visible, no color-only information.
5. **Performance** — virtualize lists > 500 items, debounce inputs, `React.memo` for expensive trees.

## Specific Patterns for This Project

### Data tables (middle column)
- Tabular numbers for sizes and percentages.
- Percentage bar: thin (4px), subtle background (`bg-white/5`), accent fill with gradient.
- Sortable headers: click for primary sort, shift-click for secondary. Clear arrow icons.
- Row hover: subtle background (`bg-white/[0.03]`), no big color change.
- Right-click menu: glass panel with `backdrop-blur-2xl`, command-palette aesthetic.

### Tree (left column)
- Indentation: 20px per level, with a 1px guide line between levels.
- Expand/collapse: chevron icon rotates 90° on open, spring animation.
- Size label: right-aligned, monospace, dimmed until hover.
- Percentage: small pill to the right of the size.

### Pie chart + insights (right column)
- Donut, not full pie (inner radius 60%).
- No chart legend — instead, a hoverable list beside it with the same colors.
- Max 6 slices; group the rest as "Other" with expand-to-see option.
- Top-N list: rank badge (1, 2, 3...) with medal colors for 1–3, neutral for 4+.

### 3D graph view
- Background: radial gradient from `#0a0a14` center to `#000000` edges.
- Star-field or very sparse particles for depth.
- Folder node: blue-violet translucent sphere with soft emissive rim.
- File node: neutral gray by default; tinted by type (image=cyan, video=magenta, archive=amber, code=green, doc=blue).
- Edges: thin, `rgba(255,255,255,0.15)`, 1px.
- Hovered node: scale 1.1, emit glow, show floating label with glass backdrop.
- Controls: corner overlay with reset camera, toggle physics, filter by type.

## Design Review Checklist

Before considering a UI task complete, verify ALL:

- [ ] Matches the target aesthetic (Raycast/Arc/Vision Pro family).
- [ ] All interactive states designed and implemented.
- [ ] Keyboard navigation works (tab order, Enter/Space activation, Esc to close).
- [ ] Focus rings visible and not ugly.
- [ ] Color contrast ≥ 4.5:1 for text.
- [ ] No layout shift on hover.
- [ ] Animations feel springy, not linear; none longer than 500ms.
- [ ] Empty state designed.
- [ ] Error state designed.
- [ ] Loading state designed (skeleton or spinner, not "Loading...").
- [ ] Works in both light and dark themes.
- [ ] Spanish and English strings both fit the layout (Spanish is often ~20% longer).
- [ ] Responsive down to 1024px wide.

## Anti-Patterns — Immediate Rejection

- ❌ Default browser styles (buttons, selects).
- ❌ Hard shadows (`shadow-md` with no customization).
- ❌ Primary colors straight out of the Tailwind box (`bg-blue-500` as a brand color).
- ❌ Mixing icon libraries.
- ❌ "Fun" fonts (Comic Sans, etc.) even as jokes.
- ❌ `alert()`, `confirm()`, `prompt()` — ever.
- ❌ Animations that can't be disabled via `prefers-reduced-motion`.
- ❌ Loading spinners longer than 2 seconds with no progress context.
- ❌ Density levels that change based on zoom (use fixed rem).
