import { describe, it, expect } from "vitest";
import type { ScanNode } from "../../../lib/types";
import {
  flattenTreeToGraph,
  nodeRadius,
  nodeColor,
  DOWNSAMPLE_THRESHOLD,
  MIN_RADIUS,
  MAX_RADIUS,
} from "../graph3d/graphData";

function folder(name: string, size: number, children: ScanNode[] = []): ScanNode {
  return {
    name,
    path: `/${name}`,
    node_type: "folder",
    size,
    accessible: true,
    is_link: false,
    link_target: null,
    children,
  };
}
function file(name: string, size: number): ScanNode {
  return {
    name,
    path: `/${name}`,
    node_type: "file",
    size,
    accessible: true,
    is_link: false,
    link_target: null,
    children: [],
  };
}

function tree3(): ScanNode {
  return {
    ...folder("root", 100),
    path: "/root",
    children: [
      { ...folder("a", 50), path: "/root/a", children: [{ ...file("a1", 10), path: "/root/a/a1" }] },
      { ...file("b", 50), path: "/root/b" },
    ],
  };
}

describe("flattenTreeToGraph", () => {
  it("emits one node per tree node and N-1 links", () => {
    const { nodes, links, downsampled } = flattenTreeToGraph(tree3());
    expect(nodes).toHaveLength(4);
    expect(links).toHaveLength(3);
    expect(downsampled).toBe(false);
    const ids = nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["/root", "/root/a", "/root/a/a1", "/root/b"]);
  });

  it("does not recurse into symlink children", () => {
    const sym: ScanNode = {
      ...folder("link", 0),
      path: "/root/link",
      is_link: true,
      link_target: "/elsewhere",
      children: [file("ghost", 1)],
    };
    const root: ScanNode = { ...folder("root", 0), path: "/root", children: [sym] };
    const { nodes } = flattenTreeToGraph(root);
    expect(nodes.map((n) => n.id).sort()).toEqual(["/root", "/root/link"]);
    expect(nodes.find((n) => n.id === "/root/link")?.kind).toBe("symlink");
  });

  it("marks inaccessible nodes", () => {
    const denied: ScanNode = { ...folder("denied", 0), path: "/root/denied", accessible: false };
    const root: ScanNode = { ...folder("root", 0), path: "/root", children: [denied] };
    const { nodes } = flattenTreeToGraph(root);
    expect(nodes.find((n) => n.id === "/root/denied")?.kind).toBe("inaccessible");
  });

  it("downsamples deepest nodes when count exceeds threshold", () => {
    const leaves: ScanNode[] = [];
    for (let i = 0; i < DOWNSAMPLE_THRESHOLD + 100; i++) {
      leaves.push({ ...file(`f${i}`, 1), path: `/root/f${i}` });
    }
    const root: ScanNode = { ...folder("root", leaves.length), path: "/root", children: leaves };
    const { nodes, downsampled } = flattenTreeToGraph(root);
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
