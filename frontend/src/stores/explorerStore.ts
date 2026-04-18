import { create } from "zustand";

type ViewMode = "columns" | "3d";

interface ExplorerState {
  viewMode: ViewMode;
  showHidden: boolean;
  followSymlinks: boolean;
  focusedPath: string | null;
  setViewMode: (mode: ViewMode) => void;
  toggleHidden: () => void;
  toggleSymlinks: () => void;
  setFocusedPath: (path: string | null) => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  viewMode: "columns",
  showHidden: false,
  followSymlinks: false,
  focusedPath: null,
  setViewMode: (viewMode) => set({ viewMode }),
  toggleHidden: () => set((s) => ({ showHidden: !s.showHidden })),
  toggleSymlinks: () => set((s) => ({ followSymlinks: !s.followSymlinks })),
  setFocusedPath: (focusedPath) => set({ focusedPath }),
}));
