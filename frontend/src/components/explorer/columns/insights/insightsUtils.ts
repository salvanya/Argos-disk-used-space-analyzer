import type { LevelScanNode, LevelScanResult } from "../../../../lib/types";
import { getFileCategory } from "../contents/contentsUtils";

export interface PieSlice {
  name: string;
  value: number;
  color: string;
}

export interface TopNItem {
  node: LevelScanNode;
  pct: number;
}

export interface SummaryStats {
  totalSize: number;
  fileCount: number;
  folderCount: number;
  largestFile: LevelScanNode | null;
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

function sizeOrZero(size: number | null): number {
  return size ?? 0;
}

export function getPieData(children: LevelScanNode[], maxSlices = 8): PieSlice[] {
  const nonZero = children.filter((n) => n.size !== null && n.size > 0);
  if (nonZero.length === 0) return [];

  const sorted = [...nonZero].sort((a, b) => sizeOrZero(b.size) - sizeOrZero(a.size));

  if (sorted.length <= maxSlices) {
    return sorted.map((n, i) => ({
      name: n.name,
      value: sizeOrZero(n.size),
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }

  const top = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices);
  const otherValue = rest.reduce((sum, n) => sum + sizeOrZero(n.size), 0);

  const slices: PieSlice[] = top.map((n, i) => ({
    name: n.name,
    value: sizeOrZero(n.size),
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
  slices.push({ name: "Other", value: otherValue, color: OTHER_COLOR });
  return slices;
}

export function getTopN(children: LevelScanNode[], n = 10): TopNItem[] {
  if (children.length === 0) return [];
  const total = children.reduce((sum, c) => sum + sizeOrZero(c.size), 0);
  const sorted = [...children].sort((a, b) => sizeOrZero(b.size) - sizeOrZero(a.size));
  return sorted.slice(0, n).map((node) => ({
    node,
    pct: total > 0 ? sizeOrZero(node.size) / total : 0,
  }));
}

export function getSummaryStats(level: LevelScanResult): SummaryStats {
  const files = level.children.filter((n) => n.nodeType === "file");
  const largestFile =
    files.length > 0
      ? files.reduce<LevelScanNode | null>((best, n) => {
          if (n.size === null) return best;
          if (best === null) return n;
          return n.size > sizeOrZero(best.size) ? n : best;
        }, null)
      : null;

  return {
    totalSize: level.directBytesKnown,
    fileCount: level.directFiles,
    folderCount: level.directFolders,
    largestFile,
  };
}

export function getTypeBreakdown(children: LevelScanNode[]): TypeBreakdownRow[] {
  if (children.length === 0) return [];

  const totalSize = children.reduce((sum, n) => sum + sizeOrZero(n.size), 0);
  if (totalSize === 0) return [];

  const map = new Map<string, { size: number; count: number }>();

  for (const node of children) {
    const cat = node.nodeType === "folder" ? "Folders" : getFileCategory(node.name);
    const entry = map.get(cat) ?? { size: 0, count: 0 };
    entry.size += sizeOrZero(node.size);
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
