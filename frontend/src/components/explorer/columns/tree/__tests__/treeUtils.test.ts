import { describe, it, expect } from "vitest";
import { buildFlatList, formatSize, computePct } from "../treeUtils";
import type { ScanNode } from "../../../../../lib/types";

function makeFolder(
  name: string,
  size: number,
  children: ScanNode[] = [],
  opts: Partial<ScanNode> = {}
): ScanNode {
  return {
    name,
    path: `/root/${name}`,
    node_type: "folder",
    size,
    accessible: true,
    is_link: false,
    link_target: null,
    children,
    ...opts,
  };
}

const leaf = (name: string, size: number) => makeFolder(name, size);

describe("formatSize", () => {
  it("formats bytes", () => expect(formatSize(500)).toBe("500 B"));
  it("formats KB", () => expect(formatSize(2048)).toBe("2.0 KB"));
  it("formats MB", () => expect(formatSize(5 * 1024 * 1024)).toBe("5.0 MB"));
  it("formats GB", () => expect(formatSize(2.5 * 1024 ** 3)).toBe("2.5 GB"));
  it("formats 0 bytes", () => expect(formatSize(0)).toBe("0 B"));
});

describe("computePct", () => {
  it("computes percentage correctly", () => expect(computePct(500, 1000)).toBe("50%"));
  it("returns < 1% for tiny values", () => expect(computePct(1, 10000)).toBe("< 1%"));
  it("returns — when parent is 0", () => expect(computePct(0, 0)).toBe("—"));
  it("caps at 100%", () => expect(computePct(1000, 500)).toBe("100%"));
});

describe("buildFlatList", () => {
  it("returns root only when no children", () => {
    const root = makeFolder("root", 1000);
    const list = buildFlatList(root, new Set(), false);
    expect(list).toHaveLength(1);
    expect(list[0].node.name).toBe("root");
    expect(list[0].depth).toBe(0);
  });

  it("shows root children when root is expanded", () => {
    const root = makeFolder("root", 1000, [leaf("a", 600), leaf("b", 400)]);
    const list = buildFlatList(root, new Set([root.path]), false);
    expect(list).toHaveLength(3);
    expect(list[1].node.name).toBe("a");
    expect(list[1].depth).toBe(1);
    expect(list[1].parentSize).toBe(1000);
  });

  it("hides grandchildren when only root is expanded", () => {
    const child = makeFolder("child", 600, [leaf("grandchild", 300)]);
    const root = makeFolder("root", 1000, [child]);
    const list = buildFlatList(root, new Set([root.path]), false);
    expect(list).toHaveLength(2);
  });

  it("shows grandchildren when both levels expanded", () => {
    const child = makeFolder("child", 600, [leaf("grandchild", 300)]);
    const root = makeFolder("root", 1000, [child]);
    const list = buildFlatList(root, new Set([root.path, child.path]), false);
    expect(list).toHaveLength(3);
  });

  it("excludes hidden folders when showHidden=false", () => {
    const root = makeFolder("root", 1000, [leaf(".git", 200), leaf("src", 800)]);
    const list = buildFlatList(root, new Set([root.path]), false);
    const names = list.map((n) => n.node.name);
    expect(names).not.toContain(".git");
    expect(names).toContain("src");
  });

  it("includes hidden folders when showHidden=true", () => {
    const root = makeFolder("root", 1000, [leaf(".git", 200), leaf("src", 800)]);
    const list = buildFlatList(root, new Set([root.path]), true);
    const names = list.map((n) => n.node.name);
    expect(names).toContain(".git");
  });

  it("marks symlink nodes as not expandable", () => {
    const link = makeFolder("linkdir", 0, [], { is_link: true });
    const root = makeFolder("root", 1000, [link]);
    const list = buildFlatList(root, new Set([root.path]), false);
    const linkRow = list.find((n) => n.node.name === "linkdir")!;
    expect(linkRow.hasChildren).toBe(false);
  });

  it("marks inaccessible nodes as not expandable", () => {
    const locked = makeFolder("locked", 0, [leaf("secret", 100)], { accessible: false });
    const root = makeFolder("root", 1000, [locked]);
    const list = buildFlatList(root, new Set([root.path, locked.path]), false);
    const lockedRow = list.find((n) => n.node.name === "locked")!;
    expect(lockedRow.hasChildren).toBe(false);
  });

  it("filters out file nodes, only folders in tree", () => {
    const file = { ...leaf("readme.txt", 100), node_type: "file" as const };
    const root = makeFolder("root", 1000, [leaf("subdir", 900), file]);
    const list = buildFlatList(root, new Set([root.path]), false);
    const names = list.map((n) => n.node.name);
    expect(names).not.toContain("readme.txt");
    expect(names).toContain("subdir");
  });
});
