import { create } from "zustand";
import type { ScanNode, ScanResult } from "../lib/types";

type ScanStatus = "idle" | "scanning" | "done" | "error";

interface ScanState {
  status: ScanStatus;
  selectedPath: string;
  nodeCount: number;
  result: ScanResult | null;
  errorMessage: string;
  setSelectedPath: (path: string) => void;
  startScan: () => void;
  updateProgress: (nodeCount: number) => void;
  completeScan: (result: ScanResult) => void;
  failScan: (message: string) => void;
  reset: () => void;
  removeNode: (path: string) => void;
}

function removeNodeFromTree(node: ScanNode, path: string): ScanNode {
  return {
    ...node,
    children: node.children
      .filter((c) => c.path !== path)
      .map((c) => removeNodeFromTree(c, path)),
  };
}

export const useScanStore = create<ScanState>((set) => ({
  status: "idle",
  selectedPath: "",
  nodeCount: 0,
  result: null,
  errorMessage: "",
  setSelectedPath: (path) => set({ selectedPath: path }),
  startScan: () => set({ status: "scanning", nodeCount: 0, result: null, errorMessage: "" }),
  updateProgress: (nodeCount) => set({ nodeCount }),
  completeScan: (result) => set({ status: "done", result }),
  failScan: (message) => set({ status: "error", errorMessage: message }),
  reset: () => set({ status: "idle", selectedPath: "", nodeCount: 0, result: null, errorMessage: "" }),
  removeNode: (path) =>
    set((state) => {
      if (!state.result) return state;
      return {
        result: {
          ...state.result,
          root: removeNodeFromTree(state.result.root, path),
        },
      };
    }),
}));
