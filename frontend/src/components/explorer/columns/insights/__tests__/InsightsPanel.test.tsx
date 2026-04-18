import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { InsightsPanel } from "../../InsightsPanel";
import { useScanStore } from "../../../../../stores/scanStore";
import { useExplorerStore } from "../../../../../stores/explorerStore";
import type { ScanNode, ScanResult } from "../../../../../lib/types";

function makeFile(name: string, size: number, path?: string): ScanNode {
  return {
    name,
    path: path ?? `/root/${name}`,
    node_type: "file",
    size,
    accessible: true,
    is_link: false,
    link_target: null,
    children: [],
  };
}

function makeFolder(name: string, size: number, path: string, children: ScanNode[] = []): ScanNode {
  return {
    name,
    path,
    node_type: "folder",
    size,
    accessible: true,
    is_link: false,
    link_target: null,
    children,
  };
}

const rootNode = makeFolder("root", 1000, "/root", [
  makeFolder("alpha", 600, "/root/alpha"),
  makeFolder("beta", 200, "/root/beta"),
  makeFile("readme.md", 100, "/root/readme.md"),
  makeFile("photo.jpg", 80, "/root/photo.jpg"),
  makeFile("archive.zip", 20, "/root/archive.zip"),
]);

const mockResult: ScanResult = {
  root: rootNode,
  scanned_at: "2026-04-18T10:00:00",
  duration_seconds: 1,
  total_files: 3,
  total_folders: 2,
  total_size: 1000,
  error_count: 0,
};

beforeEach(() => {
  useScanStore.setState({ result: null, status: "idle" } as Parameters<typeof useScanStore.setState>[0]);
  useExplorerStore.setState({ focusedPath: null } as Parameters<typeof useExplorerStore.setState>[0]);
});

describe("InsightsPanel", () => {
  it("renders empty state when focusedPath is null", () => {
    render(<InsightsPanel />);
    expect(screen.getByText(/noData/i)).toBeInTheDocument();
  });

  it("renders empty state when result is null", () => {
    useExplorerStore.setState({ focusedPath: "/root" } as Parameters<typeof useExplorerStore.setState>[0]);
    render(<InsightsPanel />);
    expect(screen.getByText(/noData/i)).toBeInTheDocument();
  });

  describe("with data", () => {
    beforeEach(() => {
      useScanStore.setState({ result: mockResult, status: "done" } as Parameters<typeof useScanStore.setState>[0]);
      useExplorerStore.setState({ focusedPath: "/root" } as Parameters<typeof useExplorerStore.setState>[0]);
    });

    it("renders the summary stats section", () => {
      render(<InsightsPanel />);
      expect(screen.getByText(/totalSize/i)).toBeInTheDocument();
      expect(screen.getByText(/^explorer\.insights\.files$/i)).toBeInTheDocument();
      expect(screen.getByText(/^explorer\.insights\.folders$/i)).toBeInTheDocument();
    });

    it("renders file and folder counts", () => {
      render(<InsightsPanel />);
      expect(screen.getByText("3")).toBeInTheDocument(); // 3 files
      expect(screen.getByText("2")).toBeInTheDocument(); // 2 folders
    });

    it("renders the pie chart", () => {
      render(<InsightsPanel />);
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });

    it("renders the top heaviest section header", () => {
      render(<InsightsPanel />);
      expect(screen.getByText(/heaviest/i)).toBeInTheDocument();
    });

    it("renders top item names in the top-N list", () => {
      render(<InsightsPanel />);
      expect(screen.getByText("alpha")).toBeInTheDocument();
      expect(screen.getByText("beta")).toBeInTheDocument();
    });

    it("renders the file type breakdown section", () => {
      render(<InsightsPanel />);
      expect(screen.getByText(/typeBreakdown/i)).toBeInTheDocument();
    });

    it("renders category rows in type breakdown", () => {
      render(<InsightsPanel />);
      expect(screen.getByText("Folders")).toBeInTheDocument();
    });
  });
});
