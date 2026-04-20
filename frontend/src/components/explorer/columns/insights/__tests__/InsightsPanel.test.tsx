import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const scanLevel = vi.fn();
const invalidateLevel = vi.fn();

vi.mock("../../../../../lib/api", () => ({
  scanLevel: (...args: unknown[]) => scanLevel(...args),
  invalidateLevel: (...args: unknown[]) => invalidateLevel(...args),
}));

import { InsightsPanel } from "../../InsightsPanel";
import { useScanStore } from "../../../../../stores/scanStore";
import { useExplorerStore } from "../../../../../stores/explorerStore";
import type { LevelScanNode, LevelScanResult } from "../../../../../lib/types";

function makeFile(name: string, size: number | null, path?: string): LevelScanNode {
  return {
    name,
    path: path ?? `/root/${name}`,
    nodeType: "file",
    size,
    accessible: true,
    isLink: false,
    linkTarget: null,
  };
}

function makeFolder(name: string, size: number | null, path: string): LevelScanNode {
  return {
    name,
    path,
    nodeType: "folder",
    size,
    accessible: true,
    isLink: false,
    linkTarget: null,
  };
}

function makeLevel(
  folderPath: string,
  directBytesKnown: number,
  children: LevelScanNode[],
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
  };
}

const rootChildren: LevelScanNode[] = [
  makeFolder("alpha", 600, "/root/alpha"),
  makeFolder("beta", 200, "/root/beta"),
  makeFile("readme.md", 100, "/root/readme.md"),
  makeFile("photo.jpg", 80, "/root/photo.jpg"),
  makeFile("archive.zip", 20, "/root/archive.zip"),
];

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
  useExplorerStore.setState({ focusedPath: null });
});

describe("InsightsPanel", () => {
  it("renders empty state when focusedPath is null", () => {
    render(<InsightsPanel />);
    expect(screen.getByText(/noData/i)).toBeInTheDocument();
  });

  it("renders empty state when focused level has no direct children", () => {
    useScanStore.setState({
      root: "/root",
      selectedPath: "/root",
      levels: { "/root": makeLevel("/root", 0, []) },
    });
    useExplorerStore.setState({ focusedPath: "/root" });
    render(<InsightsPanel />);
    expect(screen.getByText(/noData/i)).toBeInTheDocument();
  });

  describe("with data", () => {
    beforeEach(() => {
      useScanStore.setState({
        root: "/root",
        selectedPath: "/root",
        levels: { "/root": makeLevel("/root", 1000, rootChildren) },
      });
      useExplorerStore.setState({ focusedPath: "/root" });
    });

    it("renders the summary stats section", () => {
      render(<InsightsPanel />);
      expect(screen.getByText(/totalSize/i)).toBeInTheDocument();
      expect(screen.getByText(/^explorer\.insights\.files$/i)).toBeInTheDocument();
      expect(screen.getByText(/^explorer\.insights\.folders$/i)).toBeInTheDocument();
    });

    it("reports direct file and folder counts from the focused level", () => {
      render(<InsightsPanel />);
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("renders the pie chart sourced from the focused level children", () => {
      render(<InsightsPanel />);
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });

    it("renders the top heaviest section header", () => {
      render(<InsightsPanel />);
      expect(screen.getByText(/heaviest/i)).toBeInTheDocument();
    });

    it("lists only direct children in the top-N section (no descendants)", () => {
      render(<InsightsPanel />);
      expect(screen.getByText("alpha")).toBeInTheDocument();
      expect(screen.getByText("beta")).toBeInTheDocument();
      expect(screen.queryByText("deep")).not.toBeInTheDocument();
    });

    it("renders the file type breakdown section", () => {
      render(<InsightsPanel />);
      expect(screen.getByText(/typeBreakdown/i)).toBeInTheDocument();
    });

    it("renders the Folders category in the type breakdown", () => {
      render(<InsightsPanel />);
      expect(screen.getByText("Folders")).toBeInTheDocument();
    });

    it("does not render a deepest-path stat tile (dropped in M14)", () => {
      render(<InsightsPanel />);
      expect(screen.queryByText(/deepestPath/i)).not.toBeInTheDocument();
    });
  });
});
