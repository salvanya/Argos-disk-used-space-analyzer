import type { ScanNode } from "../../../../lib/types";
import { getFileCategory } from "../contents/contentsUtils";

export interface PieSlice {
  name: string;
  value: number;
  color: string;
}

export interface TopNItem {
  node: ScanNode;
  pct: number;
}

export interface SummaryStats {
  totalSize: number;
  fileCount: number;
  folderCount: number;
  largestFile: ScanNode | null;
  deepestPath: string | null;
}

export interface TypeBreakdownRow {
  category: string;
  size: number;
  count: number;
  pct: number;
}

const PIE_COLORS = [
  "#4f8bff", "#8b5cf6", "#22d3ee", "#34d399", "#f59e0b",
  "#f87171", "#a78bfa", "#38bdf8",
];
const OTHER_COLOR = "#6b7280";

export function getPieData(children: ScanNode[], maxSlices = 8): PieSlice[] {
  const nonZero = children.filter((n) => n.size > 0);
  if (nonZero.length === 0) return [];

  const sorted = [...nonZero].sort((a, b) => b.size - a.size);

  if (sorted.length <= maxSlices) {
    return sorted.map((n, i) => ({
      name: n.name,
      value: n.size,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }

  const top = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices);
  const otherValue = rest.reduce((sum, n) => sum + n.size, 0);

  const slices: PieSlice[] = top.map((n, i) => ({
    name: n.name,
    value: n.size,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
  slices.push({ name: "Other", value: otherValue, color: OTHER_COLOR });
  return slices;
}

export function getTopN(children: ScanNode[], n = 10): TopNItem[] {
  if (children.length === 0) return [];
  const total = children.reduce((sum, c) => sum + c.size, 0);
  const sorted = [...children].sort((a, b) => b.size - a.size);
  return sorted.slice(0, n).map((node) => ({
    node,
    pct: total > 0 ? node.size / total : 0,
  }));
}

export function getSummaryStats(children: ScanNode[], root: ScanNode): SummaryStats {
  const files = children.filter((n) => n.node_type === "file");
  const folders = children.filter((n) => n.node_type === "folder");
  const totalSize = children.reduce((sum, n) => sum + n.size, 0);
  const largestFile = files.length > 0
    ? files.reduce((best, n) => (n.size > best.size ? n : best), files[0])
    : null;

  const deepestPath = findDeepestPath(root);
  return { totalSize, fileCount: files.length, folderCount: folders.length, largestFile, deepestPath };
}

function findDeepestPath(root: ScanNode, cap = 10_000): string | null {
  let deepest: string | null = null;
  let maxDepth = -1;
  let visited = 0;

  function dfs(node: ScanNode, depth: number): void {
    if (visited++ >= cap) return;
    if (depth > maxDepth) {
      maxDepth = depth;
      deepest = node.path;
    }
    for (const child of node.children) {
      dfs(child, depth + 1);
    }
  }

  dfs(root, 0);
  return maxDepth > 0 ? deepest : null;
}

export function getTypeBreakdown(children: ScanNode[]): TypeBreakdownRow[] {
  if (children.length === 0) return [];

  const totalSize = children.reduce((sum, n) => sum + n.size, 0);
  if (totalSize === 0) return [];

  const map = new Map<string, { size: number; count: number }>();

  for (const node of children) {
    const cat = node.node_type === "folder" ? "Folders" : getFileCategory(node.name);
    const entry = map.get(cat) ?? { size: 0, count: 0 };
    entry.size += node.size;
    entry.count += 1;
    map.set(cat, entry);
  }

  return [...map.entries()]
    .filter(([, v]) => v.size > 0)
    .map(([category, v]) => ({
      category,
      size: v.size,
      count: v.count,
      pct: v.size / totalSize,
    }))
    .sort((a, b) => b.size - a.size);
}
