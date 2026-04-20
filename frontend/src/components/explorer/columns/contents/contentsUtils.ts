import type { LevelScanNode } from "../../../../lib/types";

export type SortKey = "name" | "size";
export type SortDir = "asc" | "desc";
export type GroupMode = "none" | "type";

export interface ContentGroup {
  label: string;
  items: LevelScanNode[];
}

function sizeOrNegInf(size: number | null): number {
  return size === null ? Number.NEGATIVE_INFINITY : size;
}

export function sortItems(items: LevelScanNode[], key: SortKey, dir: SortDir): LevelScanNode[] {
  return [...items].sort((a, b) => {
    const cmp =
      key === "name"
        ? a.name.localeCompare(b.name)
        : sizeOrNegInf(a.size) - sizeOrNegInf(b.size);
    return dir === "asc" ? cmp : -cmp;
  });
}

const CATEGORY_MAP: Record<string, string> = {
  jpg: "Images", jpeg: "Images", png: "Images", gif: "Images",
  webp: "Images", svg: "Images", bmp: "Images", ico: "Images",
  pdf: "Documents", doc: "Documents", docx: "Documents", xls: "Documents",
  xlsx: "Documents", ppt: "Documents", pptx: "Documents", txt: "Documents",
  odt: "Documents", ods: "Documents",
  zip: "Archives", tar: "Archives", gz: "Archives", bz2: "Archives",
  xz: "Archives", rar: "Archives", "7z": "Archives", zst: "Archives",
  ts: "Code", tsx: "Code", js: "Code", jsx: "Code", py: "Code",
  rs: "Code", go: "Code", java: "Code", c: "Code", cpp: "Code",
  h: "Code", cs: "Code", rb: "Code", php: "Code", swift: "Code",
  kt: "Code", scala: "Code", sh: "Code", bash: "Code",
};

export function getFileCategory(name: string): string {
  const parts = name.split(".");
  if (parts.length < 2) return "Other";
  const ext = parts.pop()!.toLowerCase();
  return CATEGORY_MAP[ext] ?? "Other";
}

const CATEGORY_ORDER = ["Images", "Documents", "Archives", "Code", "Other"];

export function groupItems(mode: GroupMode, items: LevelScanNode[]): ContentGroup[] {
  if (mode === "none") return [{ label: "", items }];

  const folders = items.filter((n) => n.nodeType === "folder");
  const files = items.filter((n) => n.nodeType !== "folder");

  const groups: ContentGroup[] = [];
  if (folders.length > 0) groups.push({ label: "Folders", items: folders });

  const byCategory = new Map<string, LevelScanNode[]>();
  for (const file of files) {
    const cat = getFileCategory(file.name);
    const bucket = byCategory.get(cat) ?? [];
    bucket.push(file);
    byCategory.set(cat, bucket);
  }

  for (const cat of CATEGORY_ORDER) {
    const bucket = byCategory.get(cat);
    if (bucket && bucket.length > 0) {
      groups.push({ label: cat, items: bucket });
      byCategory.delete(cat);
    }
  }
  for (const [cat, bucket] of byCategory) {
    groups.push({ label: cat, items: bucket });
  }

  return groups;
}
