import { create } from "zustand";
import type { LevelScanResult } from "../lib/types";
import { scanLevel as apiScanLevel, invalidateLevel as apiInvalidateLevel } from "../lib/api";
import { useSettingsStore } from "./settingsStore";

type ScanStatus = "idle" | "scanning" | "done" | "error";

interface ScanState {
  root: string | null;
  selectedPath: string;
  levels: Record<string, LevelScanResult>;
  inflight: Set<string>;
  errors: Record<string, string>;
  status: ScanStatus;
  errorMessage: string;

  openRoot: (path: string) => Promise<void>;
  ensureLevel: (path: string) => Promise<void>;
  invalidateLevel: (path: string, recursive: boolean) => Promise<void>;
  rescanRoot: () => Promise<void>;
  closeRoot: () => void;
  setSelectedPath: (path: string) => void;
  removeNode: (path: string) => void;
}

// Module-level map so concurrent ensureLevel calls share one promise.
// Kept outside zustand state: promises aren't serializable snapshot material.
const _inflightPromises = new Map<string, Promise<LevelScanResult>>();

function parentOf(path: string): string | null {
  if (!path) return null;
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (idx <= 0) return null;
  return path.slice(0, idx);
}

function isDescendantOf(candidate: string, ancestor: string): boolean {
  return candidate === ancestor || candidate.startsWith(`${ancestor}/`);
}

function currentOptionsPayload(): {
  include_hidden: boolean;
  include_system: boolean;
  exclude: string[];
} {
  const { include_hidden, include_system, exclude } = useSettingsStore.getState();
  return { include_hidden, include_system, exclude };
}

export const useScanStore = create<ScanState>((set, get) => ({
  root: null,
  selectedPath: "",
  levels: {},
  inflight: new Set<string>(),
  errors: {},
  status: "idle",
  errorMessage: "",

  setSelectedPath: (path) => set({ selectedPath: path }),

  openRoot: async (path) => {
    set((s) => {
      const next = new Set(s.inflight);
      next.add(path);
      return {
        root: path,
        selectedPath: path,
        inflight: next,
        status: "scanning",
        errorMessage: "",
      };
    });
    const options = currentOptionsPayload();
    try {
      const result = await apiScanLevel(path, path, options, false);
      set((s) => {
        const next = new Set(s.inflight);
        next.delete(path);
        const { [path]: _dropped, ...restErrors } = s.errors;
        return {
          levels: { ...s.levels, [path]: result },
          inflight: next,
          errors: restErrors,
          status: "done",
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set((s) => {
        const next = new Set(s.inflight);
        next.delete(path);
        return {
          inflight: next,
          errors: { ...s.errors, [path]: message },
          status: "error",
          errorMessage: message,
        };
      });
    }
  },

  ensureLevel: async (path) => {
    const state = get();
    if (state.levels[path]) return;
    const existing = _inflightPromises.get(path);
    if (existing) {
      try {
        await existing;
      } catch {
        /* error already surfaced by the original caller */
      }
      return;
    }
    const root = state.root ?? path;
    const options = currentOptionsPayload();
    set((s) => {
      const next = new Set(s.inflight);
      next.add(path);
      return { inflight: next };
    });
    const promise = apiScanLevel(root, path, options, false);
    _inflightPromises.set(path, promise);
    try {
      const result = await promise;
      set((s) => {
        const next = new Set(s.inflight);
        next.delete(path);
        const { [path]: _dropped, ...restErrors } = s.errors;
        return {
          levels: { ...s.levels, [path]: result },
          inflight: next,
          errors: restErrors,
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set((s) => {
        const next = new Set(s.inflight);
        next.delete(path);
        return {
          inflight: next,
          errors: { ...s.errors, [path]: message },
        };
      });
    } finally {
      _inflightPromises.delete(path);
    }
  },

  invalidateLevel: async (path, recursive) => {
    const state = get();
    const root = state.root ?? path;
    await apiInvalidateLevel(root, path, recursive);
    set((s) => {
      const nextLevels: Record<string, LevelScanResult> = {};
      for (const [k, v] of Object.entries(s.levels)) {
        if (recursive ? isDescendantOf(k, path) : k === path) continue;
        nextLevels[k] = v;
      }
      return { levels: nextLevels };
    });
  },

  rescanRoot: async () => {
    const { root, status } = get();
    if (!root || status === "scanning") return;
    set({ status: "scanning", errorMessage: "" });
    try {
      await get().invalidateLevel(root, true);
      await get().ensureLevel(root);
      const { selectedPath } = get();
      if (selectedPath && selectedPath !== root) {
        await get().ensureLevel(selectedPath);
      }
      set({ status: "done" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ status: "error", errorMessage: message });
    }
  },

  closeRoot: () =>
    set({
      root: null,
      selectedPath: "",
      levels: {},
      inflight: new Set<string>(),
      errors: {},
      status: "idle",
      errorMessage: "",
    }),

  removeNode: (path) =>
    set((state) => {
      const parent = parentOf(path);
      if (!parent || !state.levels[parent]) return state;
      return {
        levels: {
          ...state.levels,
          [parent]: {
            ...state.levels[parent],
            children: state.levels[parent].children.filter((c) => c.path !== path),
          },
        },
      };
    }),
}));
