import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    count: number;
    estimateSize: () => number;
  }) => ({
    getTotalSize: () => count * estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * estimateSize(),
      })),
  }),
}));

import { ContentsTable } from "../ContentsTable";
import { useScanStore } from "../../../../../stores/scanStore";
import { useExplorerStore } from "../../../../../stores/explorerStore";
import type { ScanNode, ScanResult } from "../../../../../lib/types";

function makeFile(
  name: string,
  size: number,
  parentPath = "/root",
  opts: Partial<ScanNode> = {}
): ScanNode {
  return {
    name,
    path: `${parentPath}/${name}`,
    node_type: "file",
    size,
    accessible: true,
    is_link: false,
    link_target: null,
    children: [],
    ...opts,
  };
}

function makeFolder(
  name: string,
  size: number,
  parentPath = "/root",
  children: ScanNode[] = [],
  opts: Partial<ScanNode> = {}
): ScanNode {
  return {
    name,
    path: `${parentPath}/${name}`,
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
    total_files: 3,
    total_folders: 1,
    total_size: root.size,
    error_count: 0,
  };
}

beforeEach(() => {
  useScanStore.setState({ status: "idle", result: null });
  useExplorerStore.setState({ focusedPath: null, showHidden: false });
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

describe("ContentsTable", () => {
  it("shows empty state when focusedPath is null", () => {
    render(<ContentsTable />);
    expect(screen.getByText("explorer.emptyContents")).toBeInTheDocument();
  });

  it("shows empty folder message when focused node has no children", () => {
    const root: ScanNode = makeFolder("root", 1000, "", []);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    useExplorerStore.setState({ focusedPath: "/root" });
    render(<ContentsTable />);
    expect(screen.getByText("explorer.contents.emptyFolder")).toBeInTheDocument();
  });

  it("renders one row per direct child", () => {
    const root: ScanNode = makeFolder("root", 1000, "", [
      makeFolder("src", 600),
      makeFile("readme.md", 400),
    ]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    useExplorerStore.setState({ focusedPath: "/root" });
    render(<ContentsTable />);
    expect(screen.getByTestId("contents-row-/root/src")).toBeInTheDocument();
    expect(screen.getByTestId("contents-row-/root/readme.md")).toBeInTheDocument();
  });

  it("clicking a folder row calls setFocusedPath", () => {
    const root: ScanNode = makeFolder("root", 1000, "", [makeFolder("src", 600)]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    useExplorerStore.setState({ focusedPath: "/root" });
    render(<ContentsTable />);
    fireEvent.click(screen.getByTestId("contents-row-/root/src"));
    expect(useExplorerStore.getState().focusedPath).toBe("/root/src");
  });

  it("clicking a file row does not change focusedPath", () => {
    const root: ScanNode = makeFolder("root", 1000, "", [makeFile("readme.md", 400)]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    useExplorerStore.setState({ focusedPath: "/root" });
    render(<ContentsTable />);
    fireEvent.click(screen.getByTestId("contents-row-/root/readme.md"));
    expect(useExplorerStore.getState().focusedPath).toBe("/root");
  });

  it("symlink rows show link badge", () => {
    const root: ScanNode = makeFolder("root", 1000, "", [
      makeFile("linked", 0, "/root", { is_link: true }),
    ]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    useExplorerStore.setState({ focusedPath: "/root" });
    render(<ContentsTable />);
    const row = screen.getByTestId("contents-row-/root/linked");
    expect(row.querySelector("[data-link-badge]")).toBeInTheDocument();
  });

  it("inaccessible rows show dash for size and percent", () => {
    const root: ScanNode = makeFolder("root", 1000, "", [
      makeFolder("locked", 0, "/root", [], { accessible: false }),
    ]);
    root.path = "/root";
    useScanStore.setState({ status: "done", result: makeScanResult(root) });
    useExplorerStore.setState({ focusedPath: "/root" });
    render(<ContentsTable />);
    const row = screen.getByTestId("contents-row-/root/locked");
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  describe("sorting", () => {
    function renderWithItems() {
      const root: ScanNode = makeFolder("root", 1000, "", [
        makeFile("gamma.txt", 300),
        makeFile("alpha.txt", 100),
        makeFile("beta.txt", 200),
      ]);
      root.path = "/root";
      useScanStore.setState({ status: "done", result: makeScanResult(root) });
      useExplorerStore.setState({ focusedPath: "/root" });
      render(<ContentsTable />);
    }

    it("first click on Name header sorts by name asc", () => {
      renderWithItems();
      fireEvent.click(screen.getByRole("button", { name: /name/i }));
      const rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/alpha.txt");
    });

    it("second click on Name header sorts by name desc", () => {
      renderWithItems();
      fireEvent.click(screen.getByRole("button", { name: /name/i }));
      fireEvent.click(screen.getByRole("button", { name: /name/i }));
      const rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/gamma.txt");
    });

    it("first click on Size header sorts by size desc (largest first)", () => {
      renderWithItems();
      fireEvent.click(screen.getByRole("button", { name: /size/i }));
      const rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/gamma.txt");
    });

    it("second click on Size header sorts by size asc (smallest first)", () => {
      renderWithItems();
      fireEvent.click(screen.getByRole("button", { name: /size/i }));
      fireEvent.click(screen.getByRole("button", { name: /size/i }));
      const rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/alpha.txt");
    });
  });

  describe("context menu", () => {
    function renderWithFile() {
      const root: ScanNode = makeFolder("root", 1000, "", [makeFile("report.pdf", 500)]);
      root.path = "/root";
      useScanStore.setState({ status: "done", result: makeScanResult(root) });
      useExplorerStore.setState({ focusedPath: "/root" });
      render(<ContentsTable />);
    }

    it("right-clicking a row opens the context menu", () => {
      renderWithFile();
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("pressing Escape closes the context menu", () => {
      renderWithFile();
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      expect(screen.getByRole("menu")).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("clicking outside the context menu closes it", () => {
      renderWithFile();
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      expect(screen.getByRole("menu")).toBeInTheDocument();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("Copy path menu item calls navigator.clipboard.writeText", async () => {
      renderWithFile();
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      fireEvent.click(screen.getByRole("menuitem", { name: /copypath/i }));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("/root/report.pdf");
    });

    it("Open in Explorer menu item is present but disabled", () => {
      renderWithFile();
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      const item = screen.getByRole("menuitem", { name: /openinexplorer/i });
      expect(item).toBeDisabled();
    });

    it("Delete menu item is present but disabled", () => {
      renderWithFile();
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      const item = screen.getByRole("menuitem", { name: /delete/i });
      expect(item).toBeDisabled();
    });
  });

  describe("properties modal", () => {
    it("clicking Properties opens a dialog showing the item path", () => {
      const root: ScanNode = makeFolder("root", 1000, "", [makeFile("report.pdf", 500)]);
      root.path = "/root";
      useScanStore.setState({ status: "done", result: makeScanResult(root) });
      useExplorerStore.setState({ focusedPath: "/root" });
      render(<ContentsTable />);
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      fireEvent.click(screen.getByRole("menuitem", { name: /properties/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("/root/report.pdf")).toBeInTheDocument();
    });
  });
});
