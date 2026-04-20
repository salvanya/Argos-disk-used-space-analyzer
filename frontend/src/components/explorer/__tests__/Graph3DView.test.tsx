import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Graph3DView } from "../graph3d/Graph3DView";
import { useScanStore } from "../../../stores/scanStore";
import { useExplorerStore } from "../../../stores/explorerStore";
import { nodeRadius } from "../graph3d/graphData";
import type { LevelScanNode, LevelScanResult } from "../../../lib/types";

vi.mock("../../../lib/api", () => ({
  scanLevel: vi.fn(),
  invalidateLevel: vi.fn(),
}));

import { scanLevel } from "../../../lib/api";
const scanLevelMock = scanLevel as unknown as ReturnType<typeof vi.fn>;

function makeNode(
  overrides: Partial<LevelScanNode> & { name: string; path: string },
): LevelScanNode {
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
  children: LevelScanNode[],
  folderPath = "/root",
  rootPath = "/root",
): LevelScanResult {
  return {
    rootPath,
    folderPath,
    scannedAt: "2026-04-20T00:00:00",
    durationSeconds: 0.1,
    accessible: true,
    isLink: false,
    directFiles: children.filter((c) => c.nodeType === "file").length,
    directFolders: children.filter((c) => c.nodeType === "folder").length,
    directBytesKnown: children.reduce((s, c) => s + (c.size ?? 0), 0),
    errorCount: 0,
    children,
    optionsHash: "abc",
  };
}

beforeEach(() => {
  scanLevelMock.mockReset();
  useScanStore.setState({
    root: null,
    selectedPath: "",
    levels: {},
    inflight: new Set<string>(),
    errors: {},
    result: null,
    status: "idle",
  });
  useExplorerStore.setState({ focusedPath: null, viewMode: "3d" });
});

describe("Graph3DView", () => {
  it("initial mount renders root + direct children only", () => {
    const rootLevel = makeLevel([
      makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null }),
      makeNode({ name: "b", path: "/root/b", nodeType: "file", size: 100 }),
    ]);
    const deepLevel = makeLevel(
      [makeNode({ name: "deep", path: "/root/a/deep", size: 50 })],
      "/root/a",
    );
    useScanStore.setState({
      root: "/root",
      levels: { "/root": rootLevel, "/root/a": deepLevel },
    });
    render(<Graph3DView />);
    expect(screen.getByTestId("graph-node-/root")).toBeInTheDocument();
    expect(screen.getByTestId("graph-node-/root/a")).toBeInTheDocument();
    expect(screen.getByTestId("graph-node-/root/b")).toBeInTheDocument();
    // /root/a is cached but not in the expanded set → its children stay hidden
    expect(screen.queryByTestId("graph-node-/root/a/deep")).not.toBeInTheDocument();
  });

  it("shows empty state when root is null", () => {
    render(<Graph3DView />);
    expect(screen.queryByTestId("force-graph-3d")).not.toBeInTheDocument();
    expect(screen.getByText("graph3d.emptyState")).toBeInTheDocument();
  });

  it("clicking a folder sphere calls ensureLevel and appends its children", async () => {
    const rootLevel = makeLevel([
      makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null }),
    ]);
    useScanStore.setState({ root: "/root", levels: { "/root": rootLevel } });
    scanLevelMock.mockImplementation(async (_root: string, path: string) => {
      if (path === "/root/a") {
        return makeLevel(
          [makeNode({ name: "deep", path: "/root/a/deep", size: 50 })],
          "/root/a",
        );
      }
      throw new Error(`unexpected scan for ${path}`);
    });

    render(<Graph3DView />);
    expect(screen.queryByTestId("graph-node-/root/a/deep")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("graph-node-/root/a"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("graph-node-/root/a/deep")).toBeInTheDocument();
    });
    expect(scanLevelMock).toHaveBeenCalledTimes(1);
  });

  it("clicking an already-expanded folder sphere does not refetch", async () => {
    const rootLevel = makeLevel([
      makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null }),
    ]);
    const aLevel = makeLevel(
      [makeNode({ name: "deep", path: "/root/a/deep", size: 50 })],
      "/root/a",
    );
    useScanStore.setState({
      root: "/root",
      levels: { "/root": rootLevel, "/root/a": aLevel },
    });

    render(<Graph3DView />);
    expect(screen.queryByTestId("graph-node-/root/a/deep")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("graph-node-/root/a"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("graph-node-/root/a/deep")).toBeInTheDocument();
    });
    const callsAfterFirst = scanLevelMock.mock.calls.length;

    await act(async () => {
      fireEvent.click(screen.getByTestId("graph-node-/root/a"));
    });
    expect(scanLevelMock.mock.calls.length).toBe(callsAfterFirst);
  });

  it("expanded folder spheres carry an outer-ring indicator (data-expanded=true)", () => {
    const rootLevel = makeLevel([
      makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null }),
      makeNode({ name: "b", path: "/root/b", nodeType: "file", size: 100 }),
    ]);
    useScanStore.setState({ root: "/root", levels: { "/root": rootLevel } });
    render(<Graph3DView />);
    // Root is auto-expanded → indicator on
    expect(screen.getByTestId("graph-node-/root").getAttribute("data-expanded")).toBe("true");
    // Unclicked folder child → indicator off
    expect(screen.getByTestId("graph-node-/root/a").getAttribute("data-expanded")).toBe("false");
    // Files are never expanded
    expect(screen.getByTestId("graph-node-/root/b").getAttribute("data-expanded")).toBe("false");
  });

  it("clicking a file sphere sets explorer focusedPath without calling ensureLevel", () => {
    const rootLevel = makeLevel([
      makeNode({ name: "file0", path: "/root/file0", nodeType: "file", size: 100 }),
    ]);
    useScanStore.setState({ root: "/root", levels: { "/root": rootLevel } });
    render(<Graph3DView />);
    fireEvent.click(screen.getByTestId("graph-node-/root/file0"));
    expect(useExplorerStore.getState().focusedPath).toBe("/root/file0");
    expect(scanLevelMock).not.toHaveBeenCalled();
  });

  it("clicking a folder sphere also sets explorer focusedPath", async () => {
    const rootLevel = makeLevel([
      makeNode({ name: "a", path: "/root/a", nodeType: "folder", size: null }),
    ]);
    const aLevel = makeLevel([], "/root/a");
    useScanStore.setState({
      root: "/root",
      levels: { "/root": rootLevel, "/root/a": aLevel },
    });
    render(<Graph3DView />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("graph-node-/root/a"));
    });
    expect(useExplorerStore.getState().focusedPath).toBe("/root/a");
  });

  it("renders legend with translated keys", () => {
    const rootLevel = makeLevel([]);
    useScanStore.setState({ root: "/root", levels: { "/root": rootLevel } });
    render(<Graph3DView />);
    expect(screen.getByText("graph3d.legend.folder")).toBeInTheDocument();
    expect(screen.getByText("graph3d.legend.file")).toBeInTheDocument();
    expect(screen.getByText("graph3d.legend.symlink")).toBeInTheDocument();
    expect(screen.getByText("graph3d.legend.inaccessible")).toBeInTheDocument();
  });

  it("passes nodeVal = radius**3 so visual radius is proportional to size (M13 spec §6)", () => {
    const rootLevel = makeLevel([
      makeNode({ name: "file0", path: "/root/file0", nodeType: "file", size: 100 }),
    ]);
    useScanStore.setState({ root: "/root", levels: { "/root": rootLevel } });
    render(<Graph3DView />);
    // root's "size" for radius purposes = directBytesKnown = 100
    const rootBtn = screen.getByTestId("graph-node-/root");
    const expectedRoot = nodeRadius(100) ** 3;
    expect(Number(rootBtn.getAttribute("data-nodeval"))).toBeCloseTo(expectedRoot, 2);

    const fileBtn = screen.getByTestId("graph-node-/root/file0");
    const expectedFile = nodeRadius(100) ** 3;
    expect(Number(fileBtn.getAttribute("data-nodeval"))).toBeCloseTo(expectedFile, 2);
  });
});
