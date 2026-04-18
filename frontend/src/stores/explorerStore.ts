import { create } from "zustand";

type ViewMode = "columns" | "3d";

interface ExplorerState {
  viewMode: ViewMode;
  showHidden: boolean;
  followSymlinks: boolean;
  setViewMode: (mode: ViewMode) => void;
  toggleHidden: () => void;
  toggleSymlinks: () => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  viewMode: "columns",
  showHidden: false,
  followSymlinks: false,
  setViewMode: (viewMode) => set({ viewMode }),
  toggleHidden: () => set((s) => ({ showHidden: !s.showHidden })),
  toggleSymlinks: () => set((s) => ({ followSymlinks: !s.followSymlinks })),
}));
