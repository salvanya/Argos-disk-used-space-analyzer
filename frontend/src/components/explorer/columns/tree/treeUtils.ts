import type { LevelScanNode, LevelScanResult } from "../../../../lib/types";

export interface FlatTreeNode {
  node: LevelScanNode;
  depth: number;
  parentSize: number | null;
  hasChildren: boolean;
  isExpanded: boolean;
  isInflight: boolean;
}

export function formatSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function computePct(size: number | null, parentSize: number | null): string {
  if (size === null || parentSize === null || parentSize === 0) return "—";
  const pct = (size / parentSize) * 100;
  if (pct < 1) return "< 1%";
  return `${Math.min(100, Math.round(pct))}%`;
}

function rootNodeFor(level: LevelScanResult): LevelScanNode {
  const name = level.folderPath.split(/[\\/]/).filter(Boolean).pop() ?? level.folderPath;
  return {
    name,
    path: level.folderPath,
    nodeType: "folder",
    size: level.directBytesKnown,
    accessible: level.accessible,
    isLink: level.isLink,
    linkTarget: null,
  };
}

export function buildFlatList(
  rootPath: string,
  levels: Record<string, LevelScanResult>,
  expanded: Set<string>,
  inflight: Set<string>,
  showHidden: boolean,
): FlatTreeNode[] {
  const rootLevel = levels[rootPath];
  if (!rootLevel) return [];

  const result: FlatTreeNode[] = [];

  function visit(node: LevelScanNode, depth: number, parentSize: number | null): void {
    const canExpand = node.nodeType === "folder" && node.accessible && !node.isLink;
    const isExpanded = canExpand && expanded.has(node.path);
    const isInflight = inflight.has(node.path);

    result.push({
      node,
      depth,
      parentSize,
      hasChildren: canExpand,
      isExpanded,
      isInflight,
    });

    if (!isExpanded) return;
    const level = levels[node.path];
    if (!level) return;
    const folderChildren = level.children.filter(
      (c) => c.nodeType === "folder" && (showHidden || !c.name.startsWith(".")),
    );
    for (const child of folderChildren) {
      visit(child, depth + 1, node.size);
    }
  }

  visit(rootNodeFor(rootLevel), 0, rootLevel.directBytesKnown);
  return result;
}
