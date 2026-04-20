import type { ScanNode } from "../../../lib/types";

export type NodeKind = "folder" | "file" | "symlink" | "inaccessible";
export type ThemeMode = "dark" | "light";

export interface GraphNode {
  id: string;
  name: string;
  kind: NodeKind;
  size: number;
  radius: number;
  color: string;
  depth: number;
  childCount: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  downsampled: boolean;
  aggregatedCount: number;
}

export const DOWNSAMPLE_THRESHOLD = 5000;
export const MIN_RADIUS = 2;
export const MAX_RADIUS = 40;

const PALETTE: Record<ThemeMode, Record<NodeKind, string>> = {
  dark: {
    folder: "#4f8bff",
    file: "#22d3ee",
    symlink: "#8b5cf6",
    inaccessible: "#64748b",
  },
  light: {
    folder: "#2563eb",
    file: "#0891b2",
    symlink: "#7c3aed",
    inaccessible: "#94a3b8",
  },
};

export function nodeColor(kind: NodeKind, theme: ThemeMode = "dark"): string {
  return PALETTE[theme][kind];
}

export function nodeRadius(size: number): number {
  if (size <= 0) return MIN_RADIUS;
  const scaled = Math.log10(size + 1) * 2.5;
  return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, scaled));
}

function classify(n: ScanNode): NodeKind {
  if (!n.accessible) return "inaccessible";
  if (n.is_link) return "symlink";
  if (n.node_type === "folder") return "folder";
  return "file";
}

export function flattenTreeToGraph(root: ScanNode, theme: ThemeMode = "dark"): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  let aggregatedCount = 0;

  type Frame = { node: ScanNode; depth: number; parentId: string | null };
  const queue: Frame[] = [{ node: root, depth: 0, parentId: null }];

  while (queue.length > 0) {
    const { node, depth, parentId } = queue.shift()!;

    if (nodes.length >= DOWNSAMPLE_THRESHOLD) {
      aggregatedCount += 1 + (classify(node) === "symlink" ? 0 : countDescendants(node));
      continue;
    }

    const kind = classify(node);
    nodes.push({
      id: node.path,
      name: node.name,
      kind,
      size: node.size,
      radius: nodeRadius(node.size),
      color: nodeColor(kind, theme),
      depth,
      childCount: node.children.length,
    });
    if (parentId !== null) {
      links.push({ source: parentId, target: node.path });
    }
    if (kind === "symlink") continue;

    for (const child of node.children) {
      queue.push({ node: child, depth: depth + 1, parentId: node.path });
    }
  }

  return { nodes, links, downsampled: aggregatedCount > 0, aggregatedCount };
}

function countDescendants(n: ScanNode): number {
  if (n.is_link) return 0;
  let total = 0;
  for (const c of n.children) total += 1 + countDescendants(c);
  return total;
}
