import type { ScanNode } from "../../../../lib/types";

export type SortKey = "name" | "size";
export type SortDir = "asc" | "desc";
export type GroupMode = "none" | "type";

export interface ContentGroup {
  label: string;
  items: ScanNode[];
}

export function getDirectChildren(root: ScanNode, path: string): ScanNode[] | null {
  if (root.path === path) return root.children;
  for (const child of root.children) {
    const found = getDirectChildren(child, path);
    if (found !== null) return found;
  }
  return null;
}

export function sortItems(items: ScanNode[], key: SortKey, dir: SortDir): ScanNode[] {
  return [...items].sort((a, b) => {
    const cmp = key === "name" ? a.name.localeCompare(b.name) : a.size - b.size;
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

export function groupItems(mode: GroupMode, items: ScanNode[]): ContentGroup[] {
  if (mode === "none") return [{ label: "", items }];

  const folders = items.filter((n) => n.node_type === "folder");
  const files = items.filter((n) => n.node_type !== "folder");

  const groups: ContentGroup[] = [];
  if (folders.length > 0) groups.push({ label: "Folders", items: folders });

  const byCategory = new Map<string, ScanNode[]>();
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
