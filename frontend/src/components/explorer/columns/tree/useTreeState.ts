import { useState, useMemo } from "react";
import type { ScanNode } from "../../../../lib/types";
import { buildFlatList, type FlatTreeNode } from "./treeUtils";

interface UseTreeStateResult {
  flatList: FlatTreeNode[];
  toggle: (path: string) => void;
}

export function useTreeState(
  root: ScanNode | null,
  showHidden: boolean
): UseTreeStateResult {
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    root ? new Set([root.path]) : new Set()
  );

  const flatList = useMemo(() => {
    if (!root) return [];
    return buildFlatList(root, expanded, showHidden);
  }, [root, expanded, showHidden]);

  function toggle(path: string): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return { flatList, toggle };
}
