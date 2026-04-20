import type { LevelScanNode, LevelScanResult } from "../../../lib/types";

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
  expanded: boolean;
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

function classify(n: LevelScanNode): NodeKind {
  if (!n.accessible) return "inaccessible";
  if (n.isLink) return "symlink";
  if (n.nodeType === "folder") return "folder";
  return "file";
}

function basenameOf(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (idx < 0) return path;
  const tail = path.slice(idx + 1);
  return tail !== "" ? tail : path;
}

export function flattenLevelsToGraph(
  rootPath: string,
  levels: Record<string, LevelScanResult>,
  expanded: Set<string>,
  theme: ThemeMode = "dark",
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  let aggregatedCount = 0;

  const rootLevel = levels[rootPath];
  if (!rootLevel) {
    return { nodes, links, downsampled: false, aggregatedCount: 0 };
  }

  const rootKind: NodeKind = rootLevel.accessible === false ? "inaccessible" : "folder";
  const rootSize = rootLevel.directBytesKnown;
  nodes.push({
    id: rootPath,
    name: basenameOf(rootPath),
    kind: rootKind,
    size: rootSize,
    radius: nodeRadius(rootSize),
    color: nodeColor(rootKind, theme),
    depth: 0,
    childCount: rootLevel.children.length,
    expanded: rootKind === "folder" && expanded.has(rootPath),
  });

  type Frame = { path: string; depth: number };
  const queue: Frame[] = [];
  if (expanded.has(rootPath)) {
    queue.push({ path: rootPath, depth: 0 });
  }

  while (queue.length > 0) {
    const { path, depth } = queue.shift()!;
    const level = levels[path];
    if (!level) continue;

    for (const child of level.children) {
      if (nodes.length >= DOWNSAMPLE_THRESHOLD) {
        aggregatedCount += 1;
        continue;
      }
      const kind = classify(child);
      const size = child.size ?? 0;
      nodes.push({
        id: child.path,
        name: child.name,
        kind,
        size,
        radius: nodeRadius(size),
        color: nodeColor(kind, theme),
        depth: depth + 1,
        childCount: levels[child.path]?.children.length ?? 0,
        expanded: kind === "folder" && expanded.has(child.path),
      });
      links.push({ source: path, target: child.path });

      if (kind === "folder" && expanded.has(child.path)) {
        queue.push({ path: child.path, depth: depth + 1 });
      }
    }
  }

  return { nodes, links, downsampled: aggregatedCount > 0, aggregatedCount };
}
