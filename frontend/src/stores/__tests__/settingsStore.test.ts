import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "../settingsStore";

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({
    include_hidden: false,
    include_system: false,
    exclude: [],
  });
});

describe("settingsStore", () => {
  it("exposes default values", () => {
    const s = useSettingsStore.getState();
    expect(s.include_hidden).toBe(false);
    expect(s.include_system).toBe(false);
    expect(s.exclude).toEqual([]);
  });

  it("toggles include_hidden and persists to localStorage", () => {
    useSettingsStore.getState().setIncludeHidden(true);
    expect(useSettingsStore.getState().include_hidden).toBe(true);
    expect(localStorage.getItem("argos-scan-options")).toContain('"include_hidden":true');
  });

  it("toggles include_system and persists to localStorage", () => {
    useSettingsStore.getState().setIncludeSystem(true);
    expect(useSettingsStore.getState().include_system).toBe(true);
    expect(localStorage.getItem("argos-scan-options")).toContain('"include_system":true');
  });

  it("adds exclusion globs and de-duplicates", () => {
    const { addExclusion } = useSettingsStore.getState();
    addExclusion("**/node_modules/**");
    addExclusion("**/node_modules/**");
    addExclusion("**/.cache/**");
    expect(useSettingsStore.getState().exclude).toEqual([
      "**/node_modules/**",
      "**/.cache/**",
    ]);
  });

  it("rejects empty / whitespace-only exclusions", () => {
    const { addExclusion } = useSettingsStore.getState();
    addExclusion("");
    addExclusion("   ");
    expect(useSettingsStore.getState().exclude).toEqual([]);
  });

  it("removes exclusions by value", () => {
    const store = useSettingsStore.getState();
    store.addExclusion("**/a/**");
    store.addExclusion("**/b/**");
    store.removeExclusion("**/a/**");
    expect(useSettingsStore.getState().exclude).toEqual(["**/b/**"]);
  });

  it("persists exclusions to localStorage under argos-exclusions", () => {
    useSettingsStore.getState().addExclusion("**/node_modules/**");
    expect(localStorage.getItem("argos-exclusions")).toContain("node_modules");
  });
});
