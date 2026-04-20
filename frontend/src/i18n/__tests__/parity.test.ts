import { describe, it, expect } from "vitest";
import en from "../en.json";
import es from "../es.json";

type JsonValue = string | { [k: string]: JsonValue };

function flatten(obj: JsonValue, prefix = ""): string[] {
  if (typeof obj === "string") return [prefix];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    keys.push(...flatten(v, next));
  }
  return keys;
}

function interpolationTokens(s: string): string[] {
  return (s.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).sort();
}

function findByPath(obj: JsonValue, path: string): string | undefined {
  const parts = path.split(".");
  let cur: JsonValue = obj;
  for (const p of parts) {
    if (typeof cur === "string") return undefined;
    const next: JsonValue | undefined = cur[p];
    if (next === undefined) return undefined;
    cur = next;
  }
  return typeof cur === "string" ? cur : undefined;
}

describe("i18n parity (EN ↔ ES)", () => {
  const enKeys = new Set(flatten(en as JsonValue));
  const esKeys = new Set(flatten(es as JsonValue));

  it("EN and ES have the same key set", () => {
    const onlyInEn = [...enKeys].filter((k) => !esKeys.has(k));
    const onlyInEs = [...esKeys].filter((k) => !enKeys.has(k));
    expect({ onlyInEn, onlyInEs }).toEqual({ onlyInEn: [], onlyInEs: [] });
  });

  it("interpolation tokens match between EN and ES for every shared key", () => {
    const mismatches: string[] = [];
    for (const key of enKeys) {
      if (!esKeys.has(key)) continue;
      const enStr = findByPath(en as JsonValue, key) ?? "";
      const esStr = findByPath(es as JsonValue, key) ?? "";
      const enToks = interpolationTokens(enStr);
      const esToks = interpolationTokens(esStr);
      if (JSON.stringify(enToks) !== JSON.stringify(esToks)) {
        mismatches.push(`${key}: EN=${JSON.stringify(enToks)} ES=${JSON.stringify(esToks)}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});
