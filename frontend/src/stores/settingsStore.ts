import { create } from "zustand";

interface SettingsState {
  include_hidden: boolean;
  include_system: boolean;
  exclude: string[];
  setIncludeHidden: (v: boolean) => void;
  setIncludeSystem: (v: boolean) => void;
  addExclusion: (glob: string) => void;
  removeExclusion: (glob: string) => void;
}

interface StoredOptions {
  include_hidden: boolean;
  include_system: boolean;
}

function readStoredOptions(): StoredOptions {
  try {
    const raw = localStorage.getItem("argos-scan-options");
    if (!raw) return { include_hidden: false, include_system: false };
    const parsed = JSON.parse(raw) as Partial<StoredOptions>;
    return {
      include_hidden: !!parsed.include_hidden,
      include_system: !!parsed.include_system,
    };
  } catch {
    return { include_hidden: false, include_system: false };
  }
}

function readStoredExclusions(): string[] {
  try {
    const raw = localStorage.getItem("argos-exclusions");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function persistOptions(state: Pick<SettingsState, "include_hidden" | "include_system">): void {
  localStorage.setItem(
    "argos-scan-options",
    JSON.stringify({
      include_hidden: state.include_hidden,
      include_system: state.include_system,
    }),
  );
}

function persistExclusions(globs: string[]): void {
  localStorage.setItem("argos-exclusions", JSON.stringify(globs));
}

const initialOptions = readStoredOptions();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  include_hidden: initialOptions.include_hidden,
  include_system: initialOptions.include_system,
  exclude: readStoredExclusions(),
  setIncludeHidden: (include_hidden) => {
    set({ include_hidden });
    persistOptions(get());
  },
  setIncludeSystem: (include_system) => {
    set({ include_system });
    persistOptions(get());
  },
  addExclusion: (glob) => {
    const trimmed = glob.trim();
    if (!trimmed) return;
    const existing = get().exclude;
    if (existing.includes(trimmed)) return;
    const next = [...existing, trimmed];
    set({ exclude: next });
    persistExclusions(next);
  },
  removeExclusion: (glob) => {
    const next = get().exclude.filter((g) => g !== glob);
    set({ exclude: next });
    persistExclusions(next);
  },
}));
