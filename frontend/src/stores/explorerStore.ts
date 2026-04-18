import { create } from "zustand";

type ViewMode = "columns" | "3d";

interface ExplorerState {
  viewMode: ViewMode;
  showHidden: boolean;
  focusedPath: string | null;
  settingsOpen: boolean;
  setViewMode: (mode: ViewMode) => void;
  toggleHidden: () => void;
  setFocusedPath: (path: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  viewMode: "columns",
  showHidden: false,
  focusedPath: null,
  settingsOpen: false,
  setViewMode: (viewMode) => set({ viewMode }),
  toggleHidden: () => set((s) => ({ showHidden: !s.showHidden })),
  setFocusedPath: (focusedPath) => set({ focusedPath }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
