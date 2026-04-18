import { create } from "zustand";
import type { ScanResult } from "../lib/types";

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
}));
