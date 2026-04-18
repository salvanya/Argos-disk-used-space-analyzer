import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getTotalSize: () => count * estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({ index: i, start: i * estimateSize() })),
  }),
}));
import { FolderTreePanel } from "../FolderTreePanel";
import { useScanStore } from "../../../../stores/scanStore";
import { useExplorerStore } from "../../../../stores/explorerStore";
import type { ScanResult, ScanNode } from "../../../../lib/types";

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

function makeScanResult(root: ScanNode): ScanResult {
  return {
    root,
    scanned_at: "2026-01-01T00:00:00",
    duration_seconds: 1,
    total_files: 5,
    total_folders: 3,
    total_size: root.size,
    error_count: 0,
  };
}

beforeEach(() => {
  useScanStore.setState({ status: "idle", result: null });
  useExplorerStore.setState({ showHidden: false, focusedPath: null });
});

describe("FolderTreePanel", () => {
  it("shows placeholder when no scan result", () => {
    render(<FolderTreePanel />);
    expect(screen.getByText("explorer.emptyFolders")).toBeInTheDocument();
  });

  it("renders root folder after scan", () => {
    const root = makeFolder("root", 1000, [makeFolder("src", 800), makeFolder("docs", 200)]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    render(<FolderTreePanel />);
    expect(screen.getByText("root")).toBeInTheDocument();
  });

  it("renders root children expanded by default", () => {
    const root = makeFolder("root", 1000, [makeFolder("src", 800), makeFolder("docs", 200)]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    render(<FolderTreePanel />);
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("docs")).toBeInTheDocument();
  });

  it("shows percentage relative to parent", () => {
    const root = makeFolder("root", 1000, [makeFolder("src", 800), makeFolder("docs", 200)]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    render(<FolderTreePanel />);
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
  });

  it("toggles children on chevron click", () => {
    const child = makeFolder("src", 800, [makeFolder("components", 600)]);
    child.path = "/root/src";
    const root = makeFolder("root", 1000, [child]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    render(<FolderTreePanel />);

    expect(screen.queryByText("components")).not.toBeInTheDocument();
    const chevrons = screen.getAllByRole("button", { name: /expand|collapse/i });
    const srcChevron = chevrons.find((b) => b.closest("[data-path='/root/src']"));
    fireEvent.click(srcChevron!);
    expect(screen.getByText("components")).toBeInTheDocument();
  });

  it("sets focusedPath when a folder row is clicked", () => {
    const root = makeFolder("root", 1000, [makeFolder("src", 800)]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    render(<FolderTreePanel />);

    fireEvent.click(screen.getByText("src"));
    expect(useExplorerStore.getState().focusedPath).toBe("/root/src");
  });

  it("renders symlink folder with link icon and no expand chevron", () => {
    const link = makeFolder("linked", 0, [], { is_link: true });
    link.path = "/root/linked";
    const root = makeFolder("root", 1000, [link]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    render(<FolderTreePanel />);

    const row = screen.getByTestId("tree-row-/root/linked");
    expect(row.querySelector("[data-icon='link']")).toBeInTheDocument();
    expect(row.querySelector("[data-chevron]")).not.toBeInTheDocument();
  });

  it("renders inaccessible folder with lock icon and no expand chevron", () => {
    const locked = makeFolder("locked", 0, [makeFolder("secret", 100)], { accessible: false });
    locked.path = "/root/locked";
    const root = makeFolder("root", 1000, [locked]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    render(<FolderTreePanel />);

    const row = screen.getByTestId("tree-row-/root/locked");
    expect(row.querySelector("[data-icon='lock']")).toBeInTheDocument();
    expect(row.querySelector("[data-chevron]")).not.toBeInTheDocument();
  });

  it("hides dot-folders when showHidden=false", () => {
    const root = makeFolder("root", 1000, [makeFolder(".git", 200), makeFolder("src", 800)]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    useExplorerStore.setState({ showHidden: false });
    render(<FolderTreePanel />);

    expect(screen.queryByText(".git")).not.toBeInTheDocument();
    expect(screen.getByText("src")).toBeInTheDocument();
  });

  it("shows dot-folders when showHidden=true", () => {
    const root = makeFolder("root", 1000, [makeFolder(".git", 200), makeFolder("src", 800)]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    useExplorerStore.setState({ showHidden: true });
    render(<FolderTreePanel />);

    expect(screen.getByText(".git")).toBeInTheDocument();
  });
});
