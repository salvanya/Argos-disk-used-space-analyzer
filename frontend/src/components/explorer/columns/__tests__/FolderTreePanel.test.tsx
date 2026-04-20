import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getTotalSize: () => count * estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({ index: i, start: i * estimateSize() })),
  }),
}));

const scanLevel = vi.fn();
const invalidateLevel = vi.fn();

vi.mock("../../../../lib/api", () => ({
  scanLevel: (...args: unknown[]) => scanLevel(...args),
  invalidateLevel: (...args: unknown[]) => invalidateLevel(...args),
}));

import { FolderTreePanel } from "../FolderTreePanel";
import { useScanStore } from "../../../../stores/scanStore";
import { useExplorerStore } from "../../../../stores/explorerStore";
import type { LevelScanNode, LevelScanResult } from "../../../../lib/types";

function makeNode(overrides: Partial<LevelScanNode> & { name: string; path: string }): LevelScanNode {
  return {
    nodeType: "folder",
    size: null,
    accessible: true,
    isLink: false,
    linkTarget: null,
    ...overrides,
  };
}

function makeLevel(overrides: Partial<LevelScanResult> & { folderPath: string }): LevelScanResult {
  return {
    rootPath: "/root",
    scannedAt: "2026-04-19T00:00:00Z",
    durationSeconds: 0.01,
    accessible: true,
    isLink: false,
    directFiles: 0,
    directFolders: 0,
    directBytesKnown: 0,
    errorCount: 0,
    children: [],
    optionsHash: "abc",
    ...overrides,
  };
}

beforeEach(() => {
  scanLevel.mockReset();
  invalidateLevel.mockReset();
  scanLevel.mockResolvedValue(
    makeLevel({ folderPath: "/mock", rootPath: "/root" }),
  );
  invalidateLevel.mockResolvedValue(undefined);
  useScanStore.setState({
    root: null,
    selectedPath: "",
    levels: {},
    inflight: new Set<string>(),
    errors: {},
    status: "idle",
    result: null,
  });
  useExplorerStore.setState({ showHidden: false, focusedPath: null });
});

describe("FolderTreePanel — placeholder", () => {
  it("shows placeholder when no scan open", () => {
    render(<FolderTreePanel />);
    expect(screen.getByText("explorer.emptyFolders")).toBeInTheDocument();
  });
});

describe("FolderTreePanel — basic rendering from levels", () => {
  function seedRoot(children: LevelScanNode[], directBytesKnown = 1000) {
    useScanStore.setState({
      root: "/root",
      selectedPath: "/root",
      levels: {
        "/root": makeLevel({
          rootPath: "/root",
          folderPath: "/root",
          directBytesKnown,
          children,
        }),
      },
    });
  }

  it("renders root folder after openRoot", () => {
    seedRoot([]);
    render(<FolderTreePanel />);
    expect(screen.getByText("root")).toBeInTheDocument();
  });

  it("renders root children expanded by default", () => {
    seedRoot([
      makeNode({ name: "src", path: "/root/src", size: 800 }),
      makeNode({ name: "docs", path: "/root/docs", size: 200 }),
    ]);
    render(<FolderTreePanel />);
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("docs")).toBeInTheDocument();
  });

  it("sets focusedPath when a folder row is clicked", () => {
    seedRoot([makeNode({ name: "src", path: "/root/src", size: 800 })]);
    render(<FolderTreePanel />);
    fireEvent.click(screen.getByText("src"));
    expect(useExplorerStore.getState().focusedPath).toBe("/root/src");
  });

  it("renders symlink folder with link icon and no expand chevron", () => {
    seedRoot([
      makeNode({ name: "linked", path: "/root/linked", isLink: true, size: null }),
    ]);
    render(<FolderTreePanel />);
    const row = screen.getByTestId("tree-row-/root/linked");
    expect(row.querySelector("[data-icon='link']")).toBeInTheDocument();
    expect(row.querySelector("[data-chevron]")).not.toBeInTheDocument();
  });

  it("renders inaccessible folder with lock icon and no expand chevron", () => {
    seedRoot([
      makeNode({ name: "locked", path: "/root/locked", accessible: false, size: null }),
    ]);
    render(<FolderTreePanel />);
    const row = screen.getByTestId("tree-row-/root/locked");
    expect(row.querySelector("[data-icon='lock']")).toBeInTheDocument();
    expect(row.querySelector("[data-chevron]")).not.toBeInTheDocument();
  });

  it("hides dot-folders when showHidden=false", () => {
    seedRoot([
      makeNode({ name: ".git", path: "/root/.git" }),
      makeNode({ name: "src", path: "/root/src" }),
    ]);
    useExplorerStore.setState({ showHidden: false });
    render(<FolderTreePanel />);
    expect(screen.queryByText(".git")).not.toBeInTheDocument();
    expect(screen.getByText("src")).toBeInTheDocument();
  });

  it("shows dot-folders when showHidden=true", () => {
    seedRoot([
      makeNode({ name: ".git", path: "/root/.git" }),
      makeNode({ name: "src", path: "/root/src" }),
    ]);
    useExplorerStore.setState({ showHidden: true });
    render(<FolderTreePanel />);
    expect(screen.getByText(".git")).toBeInTheDocument();
  });
});

describe("FolderTreePanel — lazy expansion (Phase F)", () => {
  function seedRootWithChildFolder() {
    useScanStore.setState({
      root: "/root",
      selectedPath: "/root",
      levels: {
        "/root": makeLevel({
          rootPath: "/root",
          folderPath: "/root",
          directBytesKnown: 1000,
          children: [makeNode({ name: "src", path: "/root/src", size: null })],
        }),
      },
    });
  }

  it("expand triggers ensureLevel exactly once", async () => {
    seedRootWithChildFolder();
    scanLevel.mockResolvedValueOnce(
      makeLevel({
        rootPath: "/root",
        folderPath: "/root/src",
        directBytesKnown: 0,
        children: [],
      }),
    );
    render(<FolderTreePanel />);
    const chevron = screen.getByTestId("tree-row-/root/src").querySelector("[data-chevron]");
    expect(chevron).not.toBeNull();
    fireEvent.click(chevron as Element);
    await vi.waitFor(() => expect(scanLevel).toHaveBeenCalledTimes(1));
    expect(scanLevel).toHaveBeenCalledWith("/root", "/root/src", expect.any(Object), false);
  });

  it("re-expand uses the cache — no additional API call", async () => {
    useScanStore.setState({
      root: "/root",
      selectedPath: "/root",
      levels: {
        "/root": makeLevel({
          rootPath: "/root",
          folderPath: "/root",
          children: [makeNode({ name: "src", path: "/root/src" })],
        }),
        "/root/src": makeLevel({
          rootPath: "/root",
          folderPath: "/root/src",
          children: [makeNode({ name: "inner", path: "/root/src/inner" })],
        }),
      },
    });
    render(<FolderTreePanel />);
    const chevron = screen.getByTestId("tree-row-/root/src").querySelector("[data-chevron]");
    fireEvent.click(chevron as Element);
    await new Promise((r) => setTimeout(r, 0));
    expect(scanLevel).not.toHaveBeenCalled();
  });

  it("shows spinner while inflight", () => {
    useScanStore.setState({
      root: "/root",
      selectedPath: "/root",
      levels: {
        "/root": makeLevel({
          rootPath: "/root",
          folderPath: "/root",
          children: [makeNode({ name: "src", path: "/root/src" })],
        }),
      },
      inflight: new Set(["/root/src"]),
    });
    render(<FolderTreePanel />);
    const row = screen.getByTestId("tree-row-/root/src");
    expect(row.querySelector("[data-spinner]")).toBeInTheDocument();
  });

  it("unknown folder size renders em-dash and a tooltip", () => {
    useScanStore.setState({
      root: "/root",
      selectedPath: "/root",
      levels: {
        "/root": makeLevel({
          rootPath: "/root",
          folderPath: "/root",
          children: [makeNode({ name: "src", path: "/root/src", size: null })],
        }),
      },
    });
    render(<FolderTreePanel />);
    const row = screen.getByTestId("tree-row-/root/src");
    const sizeCell = row.querySelector("[data-size]");
    expect(sizeCell).not.toBeNull();
    expect(sizeCell!.textContent).toContain("—");
    expect(sizeCell!.getAttribute("title")).toBe("tree.notYetScanned");
  });

  it("known folder size renders pretty bytes", () => {
    useScanStore.setState({
      root: "/root",
      selectedPath: "/root",
      levels: {
        "/root": makeLevel({
          rootPath: "/root",
          folderPath: "/root",
          directBytesKnown: 1024,
          children: [makeNode({ name: "src", path: "/root/src", size: 5120 })],
        }),
      },
    });
    render(<FolderTreePanel />);
    const row = screen.getByTestId("tree-row-/root/src");
    const sizeCell = row.querySelector("[data-size]");
    expect(sizeCell!.textContent).toBe("5.0 KB");
  });

  it("right-click 'Rescan this folder' invalidates then ensures", async () => {
    useScanStore.setState({
      root: "/root",
      selectedPath: "/root",
      levels: {
        "/root": makeLevel({
          rootPath: "/root",
          folderPath: "/root",
          children: [makeNode({ name: "src", path: "/root/src" })],
        }),
        "/root/src": makeLevel({
          rootPath: "/root",
          folderPath: "/root/src",
          children: [],
        }),
      },
    });
    invalidateLevel.mockResolvedValueOnce(undefined);
    scanLevel.mockResolvedValueOnce(
      makeLevel({
        rootPath: "/root",
        folderPath: "/root/src",
        children: [],
      }),
    );
    render(<FolderTreePanel />);
    const row = screen.getByTestId("tree-row-/root/src");
    fireEvent.contextMenu(row);
    const menuItem = screen.getByRole("menuitem", { name: /tree\.rescanThisFolder/i });
    fireEvent.click(menuItem);
    await vi.waitFor(() => expect(invalidateLevel).toHaveBeenCalledTimes(1));
    expect(invalidateLevel).toHaveBeenCalledWith("/root", "/root/src", true);
    await vi.waitFor(() => expect(scanLevel).toHaveBeenCalledTimes(1));
    expect(scanLevel).toHaveBeenCalledWith("/root", "/root/src", expect.any(Object), false);
  });
});
