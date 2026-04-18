import { describe, it, expect } from "vitest";
import {
  getPieData,
  getTopN,
  getSummaryStats,
  getTypeBreakdown,
} from "../insightsUtils";
import type { ScanNode } from "../../../../../lib/types";

function makeFile(name: string, size: number, path?: string): ScanNode {
  return {
    name,
    path: path ?? `/root/${name}`,
    node_type: "file",
    size,
    accessible: true,
    is_link: false,
    link_target: null,
    children: [],
  };
}

function makeFolder(name: string, size: number, path: string, children: ScanNode[] = []): ScanNode {
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
  makeFolder("alpha", 600, "/root/alpha", [
    makeFolder("deep", 400, "/root/alpha/deep", [
      makeFolder("deeper", 200, "/root/alpha/deep/deeper", [
        makeFile("leaf.txt", 200, "/root/alpha/deep/deeper/leaf.txt"),
      ]),
    ]),
    makeFile("a.ts", 200, "/root/alpha/a.ts"),
  ]),
  makeFolder("beta", 200, "/root/beta"),
  makeFile("readme.md", 100, "/root/readme.md"),
  makeFile("archive.zip", 80, "/root/archive.zip"),
  makeFile("photo.jpg", 20, "/root/photo.jpg"),
]);

const children = root.children; // alpha(600), beta(200), readme.md(100), archive.zip(80), photo.jpg(20)

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
      makeFile(`file${i}.txt`, 100 - i)
    );
    const slices = getPieData(many, 5);
    const otherSlice = slices.find((s) => s.name === "Other");
    expect(otherSlice).toBeDefined();
    expect(slices.length).toBe(6); // 5 top + Other
  });

  it("does not add Other slice when children <= maxSlices", () => {
    const few = [makeFile("a.txt", 100), makeFile("b.txt", 50)];
    const slices = getPieData(few, 8);
    expect(slices.find((s) => s.name === "Other")).toBeUndefined();
  });

  it("filters out zero-size nodes", () => {
    const withZero = [makeFile("a.txt", 100), makeFile("empty.txt", 0)];
    const slices = getPieData(withZero);
    expect(slices.find((s) => s.name === "empty.txt")).toBeUndefined();
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
});

describe("getSummaryStats", () => {
  it("counts direct file and folder children", () => {
    const stats = getSummaryStats(children, root);
    expect(stats.fileCount).toBe(3); // readme.md, archive.zip, photo.jpg
    expect(stats.folderCount).toBe(2); // alpha, beta
  });

  it("computes total size as sum of all direct children", () => {
    const stats = getSummaryStats(children, root);
    expect(stats.totalSize).toBe(1000); // 600+200+100+80+20
  });

  it("returns the largest file among direct children", () => {
    const stats = getSummaryStats(children, root);
    expect(stats.largestFile?.name).toBe("readme.md");
  });

  it("returns null largestFile when no file children", () => {
    const folderOnly = [makeFolder("f1", 100, "/root/f1"), makeFolder("f2", 200, "/root/f2")];
    const stats = getSummaryStats(folderOnly, root);
    expect(stats.largestFile).toBeNull();
  });

  it("finds deepest path via DFS on root", () => {
    const stats = getSummaryStats(children, root);
    // deepest = /root/alpha/deep/deeper/leaf.txt (depth 5)
    expect(stats.deepestPath).toBe("/root/alpha/deep/deeper/leaf.txt");
  });

  it("returns null deepestPath for a flat root with no children", () => {
    const flat = makeFolder("flat", 0, "/flat");
    const stats = getSummaryStats([], flat);
    expect(stats.deepestPath).toBeNull();
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
    // report.pdf→Documents, archive.zip→Archives, photo.jpg→Images
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
    expect(foldersRow!.size).toBe(800); // alpha(600) + beta(200)
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
