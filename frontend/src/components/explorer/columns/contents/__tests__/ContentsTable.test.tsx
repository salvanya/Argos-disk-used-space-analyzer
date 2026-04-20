import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";

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

const scanLevel = vi.fn();
const invalidateLevel = vi.fn();

vi.mock("../../../../../lib/api", () => ({
  scanLevel: (...args: unknown[]) => scanLevel(...args),
  invalidateLevel: (...args: unknown[]) => invalidateLevel(...args),
  openInExplorer: vi.fn().mockResolvedValue(undefined),
  deleteItem: vi.fn().mockResolvedValue(undefined),
}));

import { ContentsTable } from "../ContentsTable";
import { useScanStore } from "../../../../../stores/scanStore";
import { useExplorerStore } from "../../../../../stores/explorerStore";
import type { LevelScanNode, LevelScanResult } from "../../../../../lib/types";

function makeFile(
  name: string,
  size: number | null,
  parentPath = "/root",
  opts: Partial<LevelScanNode> = {},
): LevelScanNode {
  return {
    name,
    path: `${parentPath}/${name}`,
    nodeType: "file",
    size,
    accessible: true,
    isLink: false,
    linkTarget: null,
    ...opts,
  };
}

function makeFolder(
  name: string,
  size: number | null,
  parentPath = "/root",
  opts: Partial<LevelScanNode> = {},
): LevelScanNode {
  return {
    name,
    path: `${parentPath}/${name}`,
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
  opts: Partial<LevelScanResult> = {},
): LevelScanResult {
  return {
    rootPath: "/root",
    folderPath,
    scannedAt: "2026-04-19T00:00:00Z",
    durationSeconds: 0.01,
    accessible: true,
    isLink: false,
    directFiles: children.filter((c) => c.nodeType === "file").length,
    directFolders: children.filter((c) => c.nodeType === "folder").length,
    directBytesKnown,
    errorCount: 0,
    children,
    optionsHash: "abc",
    ...opts,
  };
}

beforeEach(() => {
  scanLevel.mockReset();
  invalidateLevel.mockReset();
  scanLevel.mockResolvedValue(makeLevel("/mock", 0, []));
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
  useExplorerStore.setState({ focusedPath: null, showHidden: false });
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

function seed(focusedPath: string, levels: Record<string, LevelScanResult>): void {
  useScanStore.setState({ root: "/root", selectedPath: focusedPath, levels });
  useExplorerStore.setState({ focusedPath });
}

describe("ContentsTable", () => {
  it("shows empty state when focusedPath is null", () => {
    render(<ContentsTable />);
    expect(screen.getByText("explorer.emptyContents")).toBeInTheDocument();
  });

  it("shows empty folder message when focused level has no children", () => {
    seed("/root", { "/root": makeLevel("/root", 0, []) });
    render(<ContentsTable />);
    expect(screen.getByText("explorer.contents.emptyFolder")).toBeInTheDocument();
  });

  it("renders one row per direct child", () => {
    seed("/root", {
      "/root": makeLevel("/root", 1000, [
        makeFolder("src", 600),
        makeFile("readme.md", 400),
      ]),
    });
    render(<ContentsTable />);
    expect(screen.getByTestId("contents-row-/root/src")).toBeInTheDocument();
    expect(screen.getByTestId("contents-row-/root/readme.md")).toBeInTheDocument();
  });

  it("clicking a folder row calls setFocusedPath", () => {
    seed("/root", {
      "/root": makeLevel("/root", 600, [makeFolder("src", 600)]),
    });
    render(<ContentsTable />);
    fireEvent.click(screen.getByTestId("contents-row-/root/src"));
    expect(useExplorerStore.getState().focusedPath).toBe("/root/src");
  });

  it("clicking a file row does not change focusedPath", () => {
    seed("/root", {
      "/root": makeLevel("/root", 400, [makeFile("readme.md", 400)]),
    });
    render(<ContentsTable />);
    fireEvent.click(screen.getByTestId("contents-row-/root/readme.md"));
    expect(useExplorerStore.getState().focusedPath).toBe("/root");
  });

  it("symlink rows show link badge", () => {
    seed("/root", {
      "/root": makeLevel("/root", 0, [makeFile("linked", 0, "/root", { isLink: true })]),
    });
    render(<ContentsTable />);
    const row = screen.getByTestId("contents-row-/root/linked");
    expect(row.querySelector("[data-link-badge]")).toBeInTheDocument();
  });

  it("inaccessible rows show dash for size and percent", () => {
    seed("/root", {
      "/root": makeLevel("/root", 0, [
        makeFolder("locked", null, "/root", { accessible: false }),
      ]),
    });
    render(<ContentsTable />);
    const row = screen.getByTestId("contents-row-/root/locked");
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("unknown folder size (null) row shows em-dash for size", () => {
    seed("/root", {
      "/root": makeLevel("/root", 0, [makeFolder("unscanned", null, "/root")]),
    });
    render(<ContentsTable />);
    const row = screen.getByTestId("contents-row-/root/unscanned");
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("percentages use directBytesKnown as the denominator", () => {
    // Two files: 400 and 100. directBytesKnown = 500.
    seed("/root", {
      "/root": makeLevel("/root", 500, [
        makeFile("big.txt", 400),
        makeFile("small.txt", 100),
      ]),
    });
    render(<ContentsTable />);
    // 400/500 = 80%, 100/500 = 20%
    const bigRow = screen.getByTestId("contents-row-/root/big.txt");
    const smallRow = screen.getByTestId("contents-row-/root/small.txt");
    expect(within(bigRow).getByText("80%")).toBeInTheDocument();
    expect(within(smallRow).getByText("20%")).toBeInTheDocument();
  });

  describe("lazy loading", () => {
    it("calls ensureLevel once when focusedPath is set and level is missing", async () => {
      useScanStore.setState({
        root: "/root",
        selectedPath: "/root/lazy",
        levels: {},
      });
      useExplorerStore.setState({ focusedPath: "/root/lazy" });
      scanLevel.mockResolvedValueOnce(makeLevel("/root/lazy", 0, []));
      render(<ContentsTable />);
      await vi.waitFor(() => expect(scanLevel).toHaveBeenCalledTimes(1));
      expect(scanLevel).toHaveBeenCalledWith(
        "/root",
        "/root/lazy",
        expect.any(Object),
        false,
      );
    });

    it("does not call ensureLevel when the level is already cached", async () => {
      seed("/root", { "/root": makeLevel("/root", 0, []) });
      render(<ContentsTable />);
      await new Promise((r) => setTimeout(r, 0));
      expect(scanLevel).not.toHaveBeenCalled();
    });

    it("shows an inflight placeholder while the focused level is loading", () => {
      useScanStore.setState({
        root: "/root",
        selectedPath: "/root/loading",
        levels: {},
        inflight: new Set(["/root/loading"]),
      });
      useExplorerStore.setState({ focusedPath: "/root/loading" });
      render(<ContentsTable />);
      expect(screen.getByTestId("contents-loading")).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    function renderWithItems() {
      seed("/root", {
        "/root": makeLevel("/root", 600, [
          makeFile("gamma.txt", 300),
          makeFile("alpha.txt", 100),
          makeFile("beta.txt", 200),
        ]),
      });
      return render(<ContentsTable />);
    }

    it("default render sorts by size desc without user interaction", () => {
      renderWithItems();
      const rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/gamma.txt");
      expect(rows[1]).toHaveAttribute("data-testid", "contents-row-/root/beta.txt");
      expect(rows[2]).toHaveAttribute("data-testid", "contents-row-/root/alpha.txt");
    });

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

    it("clicking Size header while already size-desc toggles to size-asc", () => {
      renderWithItems();
      fireEvent.click(screen.getByRole("button", { name: /size/i }));
      const rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/alpha.txt");
    });

    it("double-click on Size header returns to size-desc", () => {
      renderWithItems();
      fireEvent.click(screen.getByRole("button", { name: /size/i }));
      fireEvent.click(screen.getByRole("button", { name: /size/i }));
      const rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/gamma.txt");
    });

    it("custom sort persists across sibling navigation within session", () => {
      seed("/root/one", {
        "/root": makeLevel("/root", 1000, [
          makeFolder("one", 600),
          makeFolder("two", 400),
        ]),
        "/root/one": makeLevel("/root/one", 300, [
          makeFile("y.txt", 200, "/root/one"),
          makeFile("x.txt", 100, "/root/one"),
        ]),
        "/root/two": makeLevel("/root/two", 350, [
          makeFile("q.txt", 300, "/root/two"),
          makeFile("p.txt", 50, "/root/two"),
        ]),
      });
      render(<ContentsTable />);
      fireEvent.click(screen.getByRole("button", { name: /name/i }));
      let rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/one/x.txt");
      act(() => {
        useExplorerStore.setState({ focusedPath: "/root/two" });
        useScanStore.setState({ selectedPath: "/root/two" });
      });
      rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/two/p.txt");
    });

    it("unmount/remount resets to size-desc (lifecycle = session boundary)", () => {
      const { unmount } = renderWithItems();
      fireEvent.click(screen.getByRole("button", { name: /name/i }));
      let rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/alpha.txt");
      unmount();
      renderWithItems();
      rows = screen.getAllByTestId(/^contents-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "contents-row-/root/gamma.txt");
    });
  });

  describe("toolbar order", () => {
    function renderWithItems() {
      seed("/root", {
        "/root": makeLevel("/root", 100, [makeFile("alpha.txt", 100)]),
      });
      render(<ContentsTable />);
    }

    it("group-by selector precedes the Name sort button in DOM order", () => {
      renderWithItems();
      const combobox = screen.getByRole("combobox");
      const nameBtn = screen.getByRole("button", { name: /name/i });
      expect(
        combobox.compareDocumentPosition(nameBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe("context menu", () => {
    function renderWithFile() {
      seed("/root", {
        "/root": makeLevel("/root", 500, [makeFile("report.pdf", 500)]),
      });
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

    it("Copy path menu item calls navigator.clipboard.writeText", () => {
      renderWithFile();
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      fireEvent.click(screen.getByRole("menuitem", { name: /copypath/i }));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("/root/report.pdf");
    });

    it("Open in Explorer menu item is present and enabled", () => {
      renderWithFile();
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      const item = screen.getByRole("menuitem", { name: /openinexplorer/i });
      expect(item).not.toBeDisabled();
    });

    it("Delete menu item is present and enabled", () => {
      renderWithFile();
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      const item = screen.getByRole("menuitem", { name: /^explorer\.contents\.delete$/i });
      expect(item).not.toBeDisabled();
    });

    it("clicking Delete opens the confirmation modal", () => {
      renderWithFile();
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      fireEvent.click(screen.getByRole("menuitem", { name: /^explorer\.contents\.delete$/i }));
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText("report.pdf")).toBeInTheDocument();
    });
  });

  describe("properties modal", () => {
    it("clicking Properties opens a dialog showing the item path", () => {
      seed("/root", {
        "/root": makeLevel("/root", 500, [makeFile("report.pdf", 500)]),
      });
      render(<ContentsTable />);
      fireEvent.contextMenu(screen.getByTestId("contents-row-/root/report.pdf"));
      fireEvent.click(screen.getByRole("menuitem", { name: /properties/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("/root/report.pdf")).toBeInTheDocument();
    });
  });
});
