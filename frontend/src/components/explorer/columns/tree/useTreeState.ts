import { useState, useMemo, useEffect, useCallback } from "react";
import type { LevelScanResult } from "../../../../lib/types";
import { useScanStore } from "../../../../stores/scanStore";
import { buildFlatList, type FlatTreeNode } from "./treeUtils";

interface UseTreeStateResult {
  flatList: FlatTreeNode[];
  toggle: (path: string) => void;
  rescan: (path: string) => Promise<void>;
}

export function useTreeState(
  rootPath: string | null,
  levels: Record<string, LevelScanResult>,
  inflight: Set<string>,
  showHidden: boolean,
): UseTreeStateResult {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(rootPath ? [rootPath] : []),
  );

  // Keep the root in the expanded set if it changes (e.g. user picks a new root).
  useEffect(() => {
    if (!rootPath) {
      setExpanded(new Set());
      return;
    }
    setExpanded((prev) => {
      if (prev.has(rootPath)) return prev;
      const next = new Set(prev);
      next.add(rootPath);
      return next;
    });
  }, [rootPath]);

  const flatList = useMemo(() => {
    if (!rootPath) return [];
    return buildFlatList(rootPath, levels, expanded, inflight, showHidden);
  }, [rootPath, levels, expanded, inflight, showHidden]);

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
        void useScanStore.getState().ensureLevel(path);
      }
      return next;
    });
  }, []);

  const rescan = useCallback(async (path: string) => {
    const store = useScanStore.getState();
    await store.invalidateLevel(path, true);
    await store.ensureLevel(path);
    setExpanded((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, []);

  return { flatList, toggle, rescan };
}
