import { describe, it, expect } from "vitest";
import { buildFlatList, formatSize, computePct } from "../treeUtils";
import type { LevelScanNode, LevelScanResult } from "../../../../../lib/types";

function makeNode(
  name: string,
  size: number | null,
  opts: Partial<LevelScanNode> = {},
): LevelScanNode {
  return {
    name,
    path: `/root/${name}`,
    nodeType: "folder",
    size,
    accessible: true,
    isLink: false,
    linkTarget: null,
    ...opts,
  };
}

function makeLevel(
  folderPath: string,
  directBytesKnown: number,
  children: LevelScanNode[] = [],
): LevelScanResult {
  return {
    rootPath: "/root",
    folderPath,
    scannedAt: "2026-04-19T00:00:00Z",
    durationSeconds: 0.01,
    accessible: true,
    isLink: false,
    directFiles: 0,
    directFolders: children.length,
    directBytesKnown,
    errorCount: 0,
    children,
    optionsHash: "abc",
  };
}

describe("formatSize", () => {
  it("formats bytes", () => expect(formatSize(500)).toBe("500 B"));
  it("formats KB", () => expect(formatSize(2048)).toBe("2.0 KB"));
  it("formats MB", () => expect(formatSize(5 * 1024 * 1024)).toBe("5.0 MB"));
  it("formats GB", () => expect(formatSize(2.5 * 1024 ** 3)).toBe("2.5 GB"));
  it("formats 0 bytes", () => expect(formatSize(0)).toBe("0 B"));
  it("returns em-dash for null", () => expect(formatSize(null)).toBe("—"));
});

describe("computePct", () => {
  it("computes percentage correctly", () => expect(computePct(500, 1000)).toBe("50%"));
  it("returns < 1% for tiny values", () => expect(computePct(1, 10000)).toBe("< 1%"));
  it("returns — when parent is 0", () => expect(computePct(0, 0)).toBe("—"));
  it("returns — when size is null", () => expect(computePct(null, 1000)).toBe("—"));
  it("returns — when parent is null", () => expect(computePct(500, null)).toBe("—"));
  it("caps at 100%", () => expect(computePct(1000, 500)).toBe("100%"));
});

describe("buildFlatList", () => {
  it("returns root only when no children and expanded", () => {
    const levels = { "/root": makeLevel("/root", 1000, []) };
    const list = buildFlatList("/root", levels, new Set(["/root"]), new Set(), false);
    expect(list).toHaveLength(1);
    expect(list[0].node.name).toBe("root");
    expect(list[0].depth).toBe(0);
  });

  it("shows root children when root is expanded", () => {
    const levels = {
      "/root": makeLevel("/root", 1000, [
        makeNode("a", 600, { path: "/root/a" }),
        makeNode("b", 400, { path: "/root/b" }),
      ]),
    };
    const list = buildFlatList("/root", levels, new Set(["/root"]), new Set(), false);
    expect(list).toHaveLength(3);
    expect(list[1].node.name).toBe("a");
    expect(list[1].depth).toBe(1);
    expect(list[1].parentSize).toBe(1000);
  });

  it("hides grandchildren when only root is expanded", () => {
    const levels = {
      "/root": makeLevel("/root", 1000, [makeNode("child", 600, { path: "/root/child" })]),
      "/root/child": makeLevel("/root/child", 600, [
        makeNode("grandchild", 300, { path: "/root/child/grandchild" }),
      ]),
    };
    const list = buildFlatList("/root", levels, new Set(["/root"]), new Set(), false);
    expect(list).toHaveLength(2);
  });

  it("shows grandchildren when both levels expanded and cached", () => {
    const levels = {
      "/root": makeLevel("/root", 1000, [makeNode("child", 600, { path: "/root/child" })]),
      "/root/child": makeLevel("/root/child", 600, [
        makeNode("grandchild", 300, { path: "/root/child/grandchild" }),
      ]),
    };
    const list = buildFlatList(
      "/root",
      levels,
      new Set(["/root", "/root/child"]),
      new Set(),
      false,
    );
    expect(list).toHaveLength(3);
  });

  it("excludes hidden folders when showHidden=false", () => {
    const levels = {
      "/root": makeLevel("/root", 1000, [
        makeNode(".git", 200, { path: "/root/.git" }),
        makeNode("src", 800, { path: "/root/src" }),
      ]),
    };
    const list = buildFlatList("/root", levels, new Set(["/root"]), new Set(), false);
    const names = list.map((n) => n.node.name);
    expect(names).not.toContain(".git");
    expect(names).toContain("src");
  });

  it("includes hidden folders when showHidden=true", () => {
    const levels = {
      "/root": makeLevel("/root", 1000, [
        makeNode(".git", 200, { path: "/root/.git" }),
        makeNode("src", 800, { path: "/root/src" }),
      ]),
    };
    const list = buildFlatList("/root", levels, new Set(["/root"]), new Set(), true);
    const names = list.map((n) => n.node.name);
    expect(names).toContain(".git");
  });

  it("marks symlink nodes as not expandable", () => {
    const levels = {
      "/root": makeLevel("/root", 1000, [
        makeNode("linkdir", 0, { path: "/root/linkdir", isLink: true }),
      ]),
    };
    const list = buildFlatList("/root", levels, new Set(["/root"]), new Set(), false);
    const linkRow = list.find((n) => n.node.name === "linkdir")!;
    expect(linkRow.hasChildren).toBe(false);
  });

  it("marks inaccessible nodes as not expandable", () => {
    const levels = {
      "/root": makeLevel("/root", 1000, [
        makeNode("locked", 0, { path: "/root/locked", accessible: false }),
      ]),
    };
    const list = buildFlatList("/root", levels, new Set(["/root"]), new Set(), false);
    const lockedRow = list.find((n) => n.node.name === "locked")!;
    expect(lockedRow.hasChildren).toBe(false);
  });

  it("filters out file nodes, only folders in tree", () => {
    const levels = {
      "/root": makeLevel("/root", 1000, [
        makeNode("subdir", 900, { path: "/root/subdir" }),
        makeNode("readme.txt", 100, { path: "/root/readme.txt", nodeType: "file" }),
      ]),
    };
    const list = buildFlatList("/root", levels, new Set(["/root"]), new Set(), false);
    const names = list.map((n) => n.node.name);
    expect(names).not.toContain("readme.txt");
    expect(names).toContain("subdir");
  });

  it("flags inflight nodes via isInflight", () => {
    const levels = {
      "/root": makeLevel("/root", 1000, [makeNode("busy", null, { path: "/root/busy" })]),
    };
    const list = buildFlatList(
      "/root",
      levels,
      new Set(["/root"]),
      new Set(["/root/busy"]),
      false,
    );
    const busyRow = list.find((n) => n.node.name === "busy")!;
    expect(busyRow.isInflight).toBe(true);
  });
});
