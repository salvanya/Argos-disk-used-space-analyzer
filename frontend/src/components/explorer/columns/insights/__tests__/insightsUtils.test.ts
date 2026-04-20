import { describe, it, expect } from "vitest";
import {
  getPieData,
  getTopN,
  getSummaryStats,
  getTypeBreakdown,
} from "../insightsUtils";
import type { LevelScanNode, LevelScanResult } from "../../../../../lib/types";

function makeFile(name: string, size: number | null, path?: string): LevelScanNode {
  return {
    name,
    path: path ?? `/root/${name}`,
    nodeType: "file",
    size,
    accessible: true,
    isLink: false,
    linkTarget: null,
  };
}

function makeFolder(
  name: string,
  size: number | null,
  path: string,
): LevelScanNode {
  return {
    name,
    path,
    nodeType: "folder",
    size,
    accessible: true,
    isLink: false,
    linkTarget: null,
  };
}

function makeLevel(
  folderPath: string,
  directBytesKnown: number,
  children: LevelScanNode[],
): LevelScanResult {
  const directFiles = children.filter((c) => c.nodeType === "file").length;
  const directFolders = children.filter((c) => c.nodeType === "folder").length;
  return {
    rootPath: "/root",
    folderPath,
    scannedAt: "2026-04-19T00:00:00Z",
    durationSeconds: 0.01,
    accessible: true,
    isLink: false,
    directFiles,
    directFolders,
    directBytesKnown,
    errorCount: 0,
    children,
    optionsHash: "abc",
  };
}

const children: LevelScanNode[] = [
  makeFolder("alpha", 600, "/root/alpha"),
  makeFolder("beta", 200, "/root/beta"),
  makeFile("readme.md", 100, "/root/readme.md"),
  makeFile("archive.zip", 80, "/root/archive.zip"),
  makeFile("photo.jpg", 20, "/root/photo.jpg"),
];

describe("getPieData", () => {
  it("returns one slice per child, sorted by size desc", () => {
    const slices = getPieData(children);
    expect(slices[0].name).toBe("alpha");
    expect(slices[0].value).toBe(600);
  });

  it("each slice has a name, value, and color", () => {
    const slices = getPieData(children);
    for (const s of slices) {
      expect(s.name).toBeTruthy();
      expect(typeof s.value).toBe("number");
      expect(typeof s.color).toBe("string");
    }
  });

  it("collapses slices beyond maxSlices into Other", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeFile(`file${i}.txt`, 100 - i),
    );
    const slices = getPieData(many, 5);
    const otherSlice = slices.find((s) => s.name === "Other");
    expect(otherSlice).toBeDefined();
    expect(slices.length).toBe(6);
  });

  it("does not add Other slice when children <= maxSlices", () => {
    const few = [makeFile("a.txt", 100), makeFile("b.txt", 50)];
    const slices = getPieData(few, 8);
    expect(slices.find((s) => s.name === "Other")).toBeUndefined();
  });

  it("filters out zero-size and null-size nodes", () => {
    const withZero = [
      makeFile("a.txt", 100),
      makeFile("empty.txt", 0),
      makeFile("unknown.txt", null),
    ];
    const slices = getPieData(withZero);
    expect(slices.find((s) => s.name === "empty.txt")).toBeUndefined();
    expect(slices.find((s) => s.name === "unknown.txt")).toBeUndefined();
  });

  it("returns empty array for empty children", () => {
    expect(getPieData([])).toEqual([]);
  });
});

describe("getTopN", () => {
  it("returns top n items sorted by size desc", () => {
    const top = getTopN(children, 3);
    expect(top).toHaveLength(3);
    expect(top[0].node.name).toBe("alpha");
    expect(top[1].node.name).toBe("beta");
    expect(top[2].node.name).toBe("readme.md");
  });

  it("each item has a pct between 0 and 1", () => {
    const top = getTopN(children);
    for (const item of top) {
      expect(item.pct).toBeGreaterThanOrEqual(0);
      expect(item.pct).toBeLessThanOrEqual(1);
    }
  });

  it("pct sums to approximately 1 when all items are included", () => {
    const top = getTopN(children, children.length);
    const total = top.reduce((sum, i) => sum + i.pct, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("handles n greater than children length", () => {
    const top = getTopN(children, 100);
    expect(top).toHaveLength(children.length);
  });

  it("returns empty array for empty children", () => {
    expect(getTopN([])).toEqual([]);
  });

  it("treats null sizes as 0 when ranking", () => {
    const mixed = [makeFile("big", 1000), makeFile("unknown", null), makeFile("small", 10)];
    const top = getTopN(mixed, 3);
    expect(top[0].node.name).toBe("big");
    expect(top[2].node.name).toBe("unknown");
  });
});

describe("getSummaryStats", () => {
  it("reads counts from level.directFiles and level.directFolders", () => {
    const level = makeLevel("/root", 1000, children);
    const stats = getSummaryStats(level);
    expect(stats.fileCount).toBe(3);
    expect(stats.folderCount).toBe(2);
  });

  it("reads total size from level.directBytesKnown", () => {
    const level = makeLevel("/root", 1000, children);
    const stats = getSummaryStats(level);
    expect(stats.totalSize).toBe(1000);
  });

  it("returns the largest file among direct children", () => {
    const level = makeLevel("/root", 1000, children);
    const stats = getSummaryStats(level);
    expect(stats.largestFile?.name).toBe("readme.md");
  });

  it("returns null largestFile when no file children", () => {
    const folderOnly = [makeFolder("f1", 100, "/root/f1"), makeFolder("f2", 200, "/root/f2")];
    const level = makeLevel("/root", 300, folderOnly);
    const stats = getSummaryStats(level);
    expect(stats.largestFile).toBeNull();
  });

  it("ignores null-size files when picking the largest file", () => {
    const withUnknown = [
      makeFile("known", 500),
      makeFile("unknown", null),
    ];
    const level = makeLevel("/root", 500, withUnknown);
    const stats = getSummaryStats(level);
    expect(stats.largestFile?.name).toBe("known");
  });

  it("does not include a deepestPath field (dropped in M14)", () => {
    const level = makeLevel("/root", 1000, children);
    const stats = getSummaryStats(level);
    expect((stats as { deepestPath?: unknown }).deepestPath).toBeUndefined();
  });
});

describe("getTypeBreakdown", () => {
  it("aggregates files into categories sorted by size desc", () => {
    const mixed = [
      makeFolder("alpha", 600, "/root/alpha"),
      makeFolder("beta", 200, "/root/beta"),
      makeFile("report.pdf", 100, "/root/report.pdf"),
      makeFile("archive.zip", 80, "/root/archive.zip"),
      makeFile("photo.jpg", 20, "/root/photo.jpg"),
    ];
    const rows = getTypeBreakdown(mixed);
    const labels = rows.map((r) => r.category);
    expect(labels).toContain("Documents");
    expect(labels).toContain("Archives");
    expect(labels).toContain("Images");
  });

  it("aggregates folders into a Folders row", () => {
    const rows = getTypeBreakdown(children);
    const foldersRow = rows.find((r) => r.category === "Folders");
    expect(foldersRow).toBeDefined();
    expect(foldersRow!.count).toBe(2);
    expect(foldersRow!.size).toBe(800);
  });

  it("treats null sizes as 0", () => {
    const withUnknown = [
      makeFile("known.pdf", 100),
      makeFile("unknown.pdf", null),
    ];
    const rows = getTypeBreakdown(withUnknown);
    const docs = rows.find((r) => r.category === "Documents");
    expect(docs?.size).toBe(100);
    expect(docs?.count).toBe(2);
  });

  it("each row has a pct between 0 and 1", () => {
    const rows = getTypeBreakdown(children);
    for (const row of rows) {
      expect(row.pct).toBeGreaterThanOrEqual(0);
      expect(row.pct).toBeLessThanOrEqual(1);
    }
  });

  it("pct values sum to approximately 1", () => {
    const rows = getTypeBreakdown(children);
    const total = rows.reduce((s, r) => s + r.pct, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("returns empty array for empty children", () => {
    expect(getTypeBreakdown([])).toEqual([]);
  });

  it("does not include zero-size categories", () => {
    const rows = getTypeBreakdown([makeFile("a.txt", 100)]);
    for (const row of rows) {
      expect(row.size).toBeGreaterThan(0);
    }
  });
});
