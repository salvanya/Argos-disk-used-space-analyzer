import { create } from "zustand";

export const LEFT_DEFAULT = 240;
export const LEFT_MIN = 180;
export const LEFT_MAX = 400;
export const RIGHT_DEFAULT = 320;
export const RIGHT_MIN = 240;
export const RIGHT_MAX = 480;

const STORAGE_KEY = "argos-column-widths";

interface ColumnWidthsState {
  left: number;
  right: number;
  setLeft: (px: number) => void;
  setRight: (px: number) => void;
  reset: () => void;
}

interface StoredWidths {
  left: number;
  right: number;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function readStored(): StoredWidths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { left: LEFT_DEFAULT, right: RIGHT_DEFAULT };
    const parsed = JSON.parse(raw) as Partial<StoredWidths>;
    return {
      left: clamp(parsed.left ?? LEFT_DEFAULT, LEFT_MIN, LEFT_MAX),
      right: clamp(parsed.right ?? RIGHT_DEFAULT, RIGHT_MIN, RIGHT_MAX),
    };
  } catch {
    return { left: LEFT_DEFAULT, right: RIGHT_DEFAULT };
  }
}

function persist(state: StoredWidths): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage may be disabled; widths will not persist, but runtime still works
  }
}

const initial = readStored();

export const useColumnWidthsStore = create<ColumnWidthsState>((set, get) => ({
  left: initial.left,
  right: initial.right,
  setLeft: (px) => {
    const left = clamp(px, LEFT_MIN, LEFT_MAX);
    set({ left });
    persist({ left, right: get().right });
  },
  setRight: (px) => {
    const right = clamp(px, RIGHT_MIN, RIGHT_MAX);
    set({ right });
    persist({ left: get().left, right });
  },
  reset: () => {
    set({ left: LEFT_DEFAULT, right: RIGHT_DEFAULT });
    persist({ left: LEFT_DEFAULT, right: RIGHT_DEFAULT });
  },
}));
