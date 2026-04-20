import type { ScanNode } from "../../../../lib/types";

export interface FlatTreeNode {
  node: ScanNode;
  depth: number;
  parentSize: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function computePct(size: number, parentSize: number): string {
  if (parentSize === 0) return "—";
  const pct = (size / parentSize) * 100;
  if (pct < 1) return "< 1%";
  return `${Math.min(100, Math.round(pct))}%`;
}

export function buildFlatList(
  root: ScanNode,
  expanded: Set<string>,
  showHidden: boolean
): FlatTreeNode[] {
  const result: FlatTreeNode[] = [];

  function visit(node: ScanNode, depth: number, parentSize: number): void {
    const canExpand = node.accessible && !node.is_link;
    const folderChildren = canExpand
      ? node.children.filter(
          (c) =>
            c.node_type === "folder" &&
            (showHidden || !c.name.startsWith("."))
        )
      : [];
    const hasChildren = folderChildren.length > 0;
    const isExpanded = expanded.has(node.path) && hasChildren;

    result.push({ node, depth, parentSize, hasChildren, isExpanded });

    if (isExpanded) {
      for (const child of folderChildren) {
        visit(child, depth + 1, node.size);
      }
    }
  }

  visit(root, 0, root.size);
  return result;
}
