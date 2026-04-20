import { describe, it, expect } from "vitest";
import {
  sortItems,
  groupItems,
  getFileCategory,
} from "../contentsUtils";
import type { LevelScanNode } from "../../../../../lib/types";

function makeFile(
  name: string,
  size: number | null,
  opts: Partial<LevelScanNode> = {},
): LevelScanNode {
  return {
    name,
    path: `/root/${name}`,
    nodeType: "file",
    size,
    accessible: true,
    isLink: false,
    linkTarget: null,
    ...opts,
  };
}

function makeFolder(
  name: string,
  size: number | null,
  path: string,
  opts: Partial<LevelScanNode> = {},
): LevelScanNode {
  return {
    name,
    path,
    nodeType: "folder",
    size,
    accessible: true,
    isLink: false,
    linkTarget: null,
    ...opts,
  };
}

describe("sortItems", () => {
  const items: LevelScanNode[] = [
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

  it("treats null sizes as smaller than any known size (desc)", () => {
    const mixed: LevelScanNode[] = [
      makeFile("known", 500),
      makeFile("unknown", null),
      makeFile("other", 100),
    ];
    const sorted = sortItems(mixed, "size", "desc");
    expect(sorted.map((i) => i.name)).toEqual(["known", "other", "unknown"]);
  });

  it("does not mutate the original array", () => {
    const original = [...items];
    sortItems(items, "size", "desc");
    expect(items.map((i) => i.name)).toEqual(original.map((i) => i.name));
  });
});

describe("groupItems", () => {
  const mixed: LevelScanNode[] = [
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
    expect(groups[0].items.every((i) => i.nodeType === "folder")).toBe(true);
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
    const allFiles = groups.flatMap((g) => g.items).filter((i) => i.nodeType !== "folder");
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
