import { describe, it, expect } from "vitest";
import type { LevelScanNode, LevelScanResult } from "../../../lib/types";
import {
  flattenLevelsToGraph,
  nodeRadius,
  nodeColor,
  DOWNSAMPLE_THRESHOLD,
  MIN_RADIUS,
  MAX_RADIUS,
} from "../graph3d/graphData";

function makeNode(overrides: Partial<LevelScanNode> & { name: string; path: string }): LevelScanNode {
  return {
    nodeType: "file",
    size: 100,
    accessible: true,
    isLink: false,
    linkTarget: null,
    ...overrides,
  };
}

function makeLevel(
  overrides: Partial<LevelScanResult> & {
    rootPath: string;
    folderPath: string;
    children: LevelScanNode[];
  },
): LevelScanResult {
  const children = overrides.children;
  return {
    scannedAt: "2026-04-20T00:00:00",
    durationSeconds: 0.1,
    accessible: true,
    isLink: false,
    directFiles: children.filter((c) => c.nodeType === "file").length,
    directFolders: children.filter((c) => c.nodeType === "folder").length,
    directBytesKnown: children.reduce((s, c) => s + (c.size ?? 0), 0),
    errorCount: 0,
    optionsHash: "abc",
    ...overrides,
  };
}

describe("flattenLevelsToGraph", () => {
  it("emits root + direct children when only root is expanded", () => {
    const rootLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root",
      children: [
        makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null }),
        makeNode({ name: "b", path: "/root/b", nodeType: "file", size: 100 }),
      ],
    });
    const { nodes, links } = flattenLevelsToGraph(
      "/root",
      { "/root": rootLevel },
      new Set(["/root"]),
    );
    expect(nodes.map((n) => n.id).sort()).toEqual(["/root", "/root/a", "/root/b"]);
    expect(links).toHaveLength(2);
    expect(links).toContainEqual({ source: "/root", target: "/root/a" });
    expect(links).toContainEqual({ source: "/root", target: "/root/b" });
  });

  it("does not recurse into unexpanded folder children (even when cached)", () => {
    const rootLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root",
      children: [makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null })],
    });
    const aLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root/a",
      children: [makeNode({ name: "deep", path: "/root/a/deep", nodeType: "file", size: 50 })],
    });
    const { nodes } = flattenLevelsToGraph(
      "/root",
      { "/root": rootLevel, "/root/a": aLevel },
      new Set(["/root"]),
    );
    expect(nodes.map((n) => n.id).sort()).toEqual(["/root", "/root/a"]);
  });

  it("appends grand-children when the parent is expanded too", () => {
    const rootLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root",
      children: [makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null })],
    });
    const aLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root/a",
      children: [makeNode({ name: "deep", path: "/root/a/deep", nodeType: "file", size: 50 })],
    });
    const { nodes, links } = flattenLevelsToGraph(
      "/root",
      { "/root": rootLevel, "/root/a": aLevel },
      new Set(["/root", "/root/a"]),
    );
    expect(nodes.map((n) => n.id).sort()).toEqual(["/root", "/root/a", "/root/a/deep"]);
    expect(links).toContainEqual({ source: "/root/a", target: "/root/a/deep" });
  });

  it("flags expanded folder nodes with expanded=true", () => {
    const rootLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root",
      children: [makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null })],
    });
    const aLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root/a",
      children: [],
    });
    const { nodes } = flattenLevelsToGraph(
      "/root",
      { "/root": rootLevel, "/root/a": aLevel },
      new Set(["/root", "/root/a"]),
    );
    expect(nodes.find((n) => n.id === "/root")?.expanded).toBe(true);
    expect(nodes.find((n) => n.id === "/root/a")?.expanded).toBe(true);
  });

  it("leaf folders absent from expanded set are not marked expanded", () => {
    const rootLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root",
      children: [makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null })],
    });
    const { nodes } = flattenLevelsToGraph(
      "/root",
      { "/root": rootLevel },
      new Set(["/root"]),
    );
    expect(nodes.find((n) => n.id === "/root/a")?.expanded).toBe(false);
  });

  it("file nodes are never marked expanded", () => {
    const rootLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root",
      children: [makeNode({ name: "f", path: "/root/f", nodeType: "file", size: 100 })],
    });
    const { nodes } = flattenLevelsToGraph(
      "/root",
      { "/root": rootLevel },
      new Set(["/root", "/root/f"]),
    );
    expect(nodes.find((n) => n.id === "/root/f")?.expanded).toBe(false);
  });

  it("does not recurse into symlink children even when they are expanded", () => {
    const rootLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root",
      children: [
        makeNode({
          name: "link",
          path: "/root/link",
          nodeType: "folder",
          isLink: true,
          linkTarget: "/elsewhere",
          size: null,
        }),
      ],
    });
    const { nodes } = flattenLevelsToGraph(
      "/root",
      { "/root": rootLevel },
      new Set(["/root", "/root/link"]),
    );
    expect(nodes.find((n) => n.id === "/root/link")?.kind).toBe("symlink");
  });

  it("marks inaccessible nodes", () => {
    const rootLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root",
      children: [
        makeNode({
          name: "denied",
          path: "/root/denied",
          nodeType: "folder",
          accessible: false,
          size: null,
        }),
      ],
    });
    const { nodes } = flattenLevelsToGraph(
      "/root",
      { "/root": rootLevel },
      new Set(["/root"]),
    );
    expect(nodes.find((n) => n.id === "/root/denied")?.kind).toBe("inaccessible");
  });

  it("returns an empty graph when the root level is missing", () => {
    const { nodes, links } = flattenLevelsToGraph("/root", {}, new Set());
    expect(nodes).toHaveLength(0);
    expect(links).toHaveLength(0);
  });

  it("treats null sizes as 0 for radius without crashing", () => {
    const rootLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root",
      children: [makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null })],
    });
    const { nodes } = flattenLevelsToGraph(
      "/root",
      { "/root": rootLevel },
      new Set(["/root"]),
    );
    const a = nodes.find((n) => n.id === "/root/a");
    expect(a?.size).toBe(0);
    expect(a?.radius).toBeGreaterThanOrEqual(MIN_RADIUS);
  });

  it("downsamples when nodes would exceed the threshold", () => {
    const many: LevelScanNode[] = [];
    for (let i = 0; i < DOWNSAMPLE_THRESHOLD + 100; i++) {
      many.push(makeNode({ name: `f${i}`, path: `/root/f${i}`, nodeType: "file", size: 1 }));
    }
    const rootLevel = makeLevel({
      rootPath: "/root",
      folderPath: "/root",
      children: many,
    });
    const { nodes, downsampled } = flattenLevelsToGraph(
      "/root",
      { "/root": rootLevel },
      new Set(["/root"]),
    );
    expect(downsampled).toBe(true);
    expect(nodes.length).toBeLessThanOrEqual(DOWNSAMPLE_THRESHOLD + 1);
  });
});

describe("nodeRadius", () => {
  it("clamps size 0 to MIN_RADIUS", () => {
    expect(nodeRadius(0)).toBe(MIN_RADIUS);
  });

  it("is monotonic with size", () => {
    expect(nodeRadius(10)).toBeLessThanOrEqual(nodeRadius(1_000_000));
    expect(nodeRadius(1_000)).toBeLessThanOrEqual(nodeRadius(10_000));
  });

  it("caps at MAX_RADIUS for huge sizes", () => {
    expect(nodeRadius(1e18)).toBeLessThanOrEqual(MAX_RADIUS);
    expect(nodeRadius(1e18)).toBeGreaterThanOrEqual(MAX_RADIUS - 0.01);
  });
});

describe("nodeColor", () => {
  it("returns distinct colors per kind in dark theme", () => {
    const colors = new Set([
      nodeColor("folder", "dark"),
      nodeColor("file", "dark"),
      nodeColor("symlink", "dark"),
      nodeColor("inaccessible", "dark"),
    ]);
    expect(colors.size).toBe(4);
  });

  it("returns different palette for light vs dark theme", () => {
    expect(nodeColor("folder", "dark")).not.toBe(nodeColor("folder", "light"));
  });
});
