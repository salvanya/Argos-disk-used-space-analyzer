# Lesson: vite.config.ts `test` field fails tsc

## Symptom
`tsc -b` fails with `Object literal may only specify known properties, and 'test' does not exist in type 'UserConfigExport'` on `vite.config.ts`, even when a `/// <reference types="vitest" />` is present.

## Root cause
Two issues stack:
1. Triple-slash reference directives must precede all other statements, including imports. Placed after imports they are silently ignored.
2. Even with the reference at top, `defineConfig` imported from `vite` is typed against Vite's `UserConfigExport`, which does not include `test`. The vitest-aware overload lives in `vitest/config`.

## Fix
```ts
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
```
Keep the reference on line 1, and import `defineConfig` from `vitest/config` (not `vite`).

## How to recognize it next time
Any error on the `test: { ... }` block in `vite.config.ts` when running `tsc`. `vite build` alone won't catch it — only `tsc -b`.
