import { useEffect } from "react";
import { useExplorerStore } from "../../../../stores/explorerStore";
import { useScanStore } from "../../../../stores/scanStore";
import type { LevelScanResult } from "../../../../lib/types";

export interface FocusedLevelState {
  focusedPath: string | null;
  level: LevelScanResult | null;
  isInflight: boolean;
  error: string | null;
}

export function useFocusedLevel(): FocusedLevelState {
  const focusedPath = useExplorerStore((s) => s.focusedPath);
  const root = useScanStore((s) => s.root);
  const levels = useScanStore((s) => s.levels);
  const inflight = useScanStore((s) => s.inflight);
  const errors = useScanStore((s) => s.errors);

  const level = focusedPath ? (levels[focusedPath] ?? null) : null;
  const isInflight = focusedPath ? inflight.has(focusedPath) : false;
  const error = focusedPath ? (errors[focusedPath] ?? null) : null;

  useEffect(() => {
    if (!focusedPath || !root) return;
    if (level !== null) return;
    if (isInflight) return;
    if (error !== null) return;
    void useScanStore.getState().ensureLevel(focusedPath);
  }, [focusedPath, root, level, isInflight, error]);

  return { focusedPath, level, isInflight, error };
}
