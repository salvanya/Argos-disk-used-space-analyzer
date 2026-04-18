---
name: i18n interpolation not available in tests
description: t() with interpolation params returns the key verbatim in tests — render dynamic values outside t()
type: feedback
---

In tests, react-i18next returns the key string as-is with no interpolation. So `t("foo.title", { name })` renders as `"foo.title"` — the name is lost.

**Why:** test-setup.ts initializes i18next with empty resources, so every key returns itself verbatim.

**Fix:** Render dynamic values (item names, counts) as separate JSX elements outside the `t()` call:
```tsx
<h2>{t("foo.title")}</h2>
<p className="font-mono">{name}</p>
```
Then `screen.getByText(name)` works in tests.

**How to apply:** Any time a translation string needs to embed user-provided data AND that data needs to be testable in RTL, render the data in a sibling/child element rather than as an interpolation argument.
