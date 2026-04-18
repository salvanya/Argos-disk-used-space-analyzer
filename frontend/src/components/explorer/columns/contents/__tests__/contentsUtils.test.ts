import { describe, it, expect } from "vitest";
import {
  getDirectChildren,
  sortItems,
  groupItems,
  getFileCategory,
} from "../contentsUtils";
import type { ScanNode } from "../../../../../lib/types";

function makeFile(name: string, size: number, opts: Partial<ScanNode> = {}): ScanNode {
  return {
    name,
    path: `/root/${name}`,
    node_type: "file",
    size,
    accessible: true,
    is_link: false,
    link_target: null,
    children: [],
    ...opts,
  };
}

function makeFolder(
  name: string,
  size: number,
  path: string,
  children: ScanNode[] = []
): ScanNode {
  return {
    name,
    path,
    node_type: "folder",
    size,
    accessible: true,
    is_link: false,
    link_target: null,
    children,
  };
}

const root = makeFolder("root", 1000, "/root", [
  makeFolder("src", 600, "/root/src", [
    makeFile("index.ts", 100),
    makeFile("app.ts", 200),
  ]),
  makeFolder("docs", 300, "/root/docs", []),
  makeFile("readme.md", 100),
]);

describe("getDirectChildren", () => {
  it("returns children of root node", () => {
    const children = getDirectChildren(root, "/root");
    expect(children).not.toBeNull();
    expect(children!.map((c) => c.name)).toEqual(["src", "docs", "readme.md"]);
  });

  it("returns children of a nested node by path", () => {
    const children = getDirectChildren(root, "/root/src");
    expect(children).not.toBeNull();
    expect(children!.map((c) => c.name)).toEqual(["index.ts", "app.ts"]);
  });

  it("returns null when path is not found in tree", () => {
    expect(getDirectChildren(root, "/nonexistent")).toBeNull();
  });

  it("returns empty array for a node with no children", () => {
    const children = getDirectChildren(root, "/root/docs");
    expect(children).toEqual([]);
  });
});

describe("sortItems", () => {
  const items: ScanNode[] = [
    makeFile("gamma.txt", 300),
    makeFile("alpha.txt", 100),
    makeFile("beta.txt", 200),
  ];

  it("sorts by name asc", () => {
    const sorted = sortItems(items, "name", "asc");
    expect(sorted.map((i) => i.name)).toEqual(["alpha.txt", "beta.txt", "gamma.txt"]);
  });

  it("sorts by name desc", () => {
    const sorted = sortItems(items, "name", "desc");
    expect(sorted.map((i) => i.name)).toEqual(["gamma.txt", "beta.txt", "alpha.txt"]);
  });

  it("sorts by size desc (largest first)", () => {
    const sorted = sortItems(items, "size", "desc");
    expect(sorted.map((i) => i.size)).toEqual([300, 200, 100]);
  });

  it("sorts by size asc (smallest first)", () => {
    const sorted = sortItems(items, "size", "asc");
    expect(sorted.map((i) => i.size)).toEqual([100, 200, 300]);
  });

  it("does not mutate the original array", () => {
    const original = [...items];
    sortItems(items, "size", "desc");
    expect(items.map((i) => i.name)).toEqual(original.map((i) => i.name));
  });
});

describe("groupItems", () => {
  const mixed: ScanNode[] = [
    makeFile("photo.jpg", 500),
    makeFolder("src", 300, "/root/src"),
    makeFile("archive.zip", 200),
    makeFile("script.py", 100),
    makeFile("report.pdf", 150),
  ];

  it("returns one group with all items when mode is none", () => {
    const groups = groupItems("none", mixed);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(5);
  });

  it("puts folders first when mode is type", () => {
    const groups = groupItems("type", mixed);
    expect(groups[0].label).toBe("Folders");
    expect(groups[0].items.every((i) => i.node_type === "folder")).toBe(true);
  });

  it("groups files by extension category when mode is type", () => {
    const groups = groupItems("type", mixed);
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("Images");
    expect(labels).toContain("Archives");
    expect(labels).toContain("Code");
    expect(labels).toContain("Documents");
  });

  it("each file appears in exactly one group", () => {
    const groups = groupItems("type", mixed);
    const allFiles = groups.flatMap((g) => g.items).filter((i) => i.node_type !== "folder");
    const fileNames = allFiles.map((f) => f.name);
    expect(fileNames).toContain("photo.jpg");
    expect(fileNames).toContain("archive.zip");
    expect(fileNames).toContain("script.py");
    expect(fileNames).toContain("report.pdf");
    expect(new Set(fileNames).size).toBe(fileNames.length);
  });
});

describe("getFileCategory", () => {
  it.each([
    ["photo.jpg", "Images"],
    ["banner.png", "Images"],
    ["animation.gif", "Images"],
    ["icon.svg", "Images"],
  ])("maps %s to Images", (name, expected) => {
    expect(getFileCategory(name)).toBe(expected);
  });

  it.each([
    ["report.pdf", "Documents"],
    ["letter.docx", "Documents"],
    ["notes.txt", "Documents"],
    ["sheet.xlsx", "Documents"],
  ])("maps %s to Documents", (name, expected) => {
    expect(getFileCategory(name)).toBe(expected);
  });

  it.each([
    ["backup.zip", "Archives"],
    ["tarball.tar", "Archives"],
    ["compressed.gz", "Archives"],
    ["packed.rar", "Archives"],
  ])("maps %s to Archives", (name, expected) => {
    expect(getFileCategory(name)).toBe(expected);
  });

  it.each([
    ["main.ts", "Code"],
    ["app.tsx", "Code"],
    ["server.py", "Code"],
    ["handler.go", "Code"],
  ])("maps %s to Code", (name, expected) => {
    expect(getFileCategory(name)).toBe(expected);
  });

  it("maps unknown extension to Other", () => {
    expect(getFileCategory("file.xyz123")).toBe("Other");
  });

  it("maps file with no extension to Other", () => {
    expect(getFileCategory("Makefile")).toBe("Other");
  });
});
