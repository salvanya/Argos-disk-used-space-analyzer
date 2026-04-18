# Lesson: RTL query names don't match i18n keys with spaces

## Symptom
`screen.getByRole("menuitem", { name: /copy path/i })` throws "Unable to find accessible element" even though the button is clearly in the DOM.

## Root cause
`test-setup.ts` initialises i18next with empty translation resources (`resources: { en: { translation: {} } }`). When no translation is found, react-i18next returns the key as-is — e.g. `"explorer.contents.copyPath"`. A regex like `/copy path/i` (with a space) will never match the camelCase key string.

## Fix / workaround
Use a regex that matches the camelCase form of the key:
```ts
// Bad  — spaces won't match camelCase key
getByRole("menuitem", { name: /copy path/i })
// Good — matches "copyPath" and "explorer.contents.copyPath"
getByRole("menuitem", { name: /copypath/i })
```
Or use `getByText` / `getByRole` with the full key string: `"explorer.contents.copyPath"`.

## How to recognise it next time
Test error: `Unable to find an accessible element with the role "X" and name /some phrase/i` — but the element IS rendered (visible in the printed DOM). Check whether the rendered text is an i18n key and whether the regex contains spaces that don't exist in the key.
