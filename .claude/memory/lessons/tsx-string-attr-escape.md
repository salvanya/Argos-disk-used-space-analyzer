---
name: tsx string attribute escape quirk
description: JSX quoted attributes don't honor JS escape sequences; use `{"..."}` to pass a real backslash or other escape
type: feedback
---

# Lesson: TSX string attribute escape quirk

## Symptom
Component test passed `rootPath="C:\\Users\\u"`. The component received the literal 11-char string `C:\\Users\\u` (double-backslashes preserved), not the 9-char `C:\Users\u`. Assertions using the real path failed with vitest diffs showing extra backslashes and unexpected trailing separators.

## Root cause
JSX treats quoted attribute values as HTML-style literal strings. JS escape sequences are NOT interpreted — `"\\"` is two characters, not one `\`. Only the expression form honors JS string escaping.

## Fix / workaround
Use curly-brace expression form for any attribute value containing escape sequences:
```tsx
// ❌ wrong — passes literal "C:\\Users\\u"
<Breadcrumbs rootPath="C:\\Users\\u" currentPath="C:\\Users\\u\\Docs" />

// ✅ right — passes the intended "C:\Users\u"
<Breadcrumbs rootPath={"C:\\Users\\u"} currentPath={"C:\\Users\\u\\Docs"} />
```

## How to recognize it next time
RTL/vitest tests where the component deals with Windows paths, regex strings, or anything with backslashes/escape sequences. If the received value in a failing assertion has "too many" backslashes (or looks like the raw source text rather than the intended string), the prop is being passed via plain-string JSX attribute — switch to the `{"..."}` expression form.
