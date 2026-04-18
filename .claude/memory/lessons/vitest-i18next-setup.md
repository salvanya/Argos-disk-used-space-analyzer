# Lesson: react-i18next Needs Initialization in Vitest

## Symptom
Tests pass but Vitest reports unhandled errors: `TypeError: i18n.changeLanguage is not a function` when a component calls `i18n.changeLanguage(...)` in response to a user event.

## Root Cause
`useTranslation()` from `react-i18next` returns a stub `i18n` object in jsdom. The stub lacks `changeLanguage` unless i18next is properly initialized before the test suite runs.

## Fix / workaround
In `src/test-setup.ts`, initialize i18next before tests:
```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: {} } },
  interpolation: { escapeValue: false },
});
```
Reference this file in `vite.config.ts` under `test.setupFiles`.

## How to recognize it next time
Unhandled error in a test that clicks a language/locale toggle. The component calls `i18n.changeLanguage` and it explodes. Solution is always the setup file, not the component.
