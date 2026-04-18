import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Graph3DView } from "../graph3d/Graph3DView";
import { useScanStore } from "../../../stores/scanStore";
import { useExplorerStore } from "../../../stores/explorerStore";
import type { ScanResult } from "../../../lib/types";

function makeResult(nodeCount = 3): ScanResult {
  const children = [];
  for (let i = 0; i < nodeCount - 1; i++) {
    children.push({
      name: `file${i}`,
      path: `/root/file${i}`,
      node_type: "file" as const,
      size: (i + 1) * 100,
      accessible: true,
      is_link: false,
      link_target: null,
      children: [],
    });
  }
  return {
    root: {
      name: "root",
      path: "/root",
      node_type: "folder",
      size: 1000,
      accessible: true,
      is_link: false,
      link_target: null,
      children,
    },
    scanned_at: "2026-04-18T00:00:00",
    duration_seconds: 1,
    total_files: nodeCount - 1,
    total_folders: 1,
    total_size: 1000,
    error_count: 0,
  };
}

beforeEach(() => {
  useScanStore.setState({ result: null, status: "idle" });
  useExplorerStore.setState({ focusedPath: null, viewMode: "3d" });
});

describe("Graph3DView", () => {
  it("renders the mocked force graph with derived nodes when result is present", () => {
    useScanStore.setState({ result: makeResult(3), status: "done" });
    render(<Graph3DView />);
    expect(screen.getByTestId("force-graph-3d")).toBeInTheDocument();
    expect(screen.getByTestId("graph-node-/root")).toBeInTheDocument();
    expect(screen.getByTestId("graph-node-/root/file0")).toBeInTheDocument();
  });

  it("shows empty state when result is null", () => {
    render(<Graph3DView />);
    expect(screen.queryByTestId("force-graph-3d")).not.toBeInTheDocument();
    expect(screen.getByText("graph3d.emptyState")).toBeInTheDocument();
  });

  it("clicking a node sets explorer focusedPath", () => {
    useScanStore.setState({ result: makeResult(3), status: "done" });
    render(<Graph3DView />);
    fireEvent.click(screen.getByTestId("graph-node-/root/file0"));
    expect(useExplorerStore.getState().focusedPath).toBe("/root/file0");
  });

  it("renders legend with translated keys", () => {
    useScanStore.setState({ result: makeResult(3), status: "done" });
    render(<Graph3DView />);
    expect(screen.getByText("graph3d.legend.folder")).toBeInTheDocument();
    expect(screen.getByText("graph3d.legend.file")).toBeInTheDocument();
    expect(screen.getByText("graph3d.legend.symlink")).toBeInTheDocument();
    expect(screen.getByText("graph3d.legend.inaccessible")).toBeInTheDocument();
  });

  it("does not show downsample notice for small scans", () => {
    useScanStore.setState({ result: makeResult(3), status: "done" });
    render(<Graph3DView />);
    expect(screen.queryByText(/graph3d\.downsampledNotice/)).not.toBeInTheDocument();
  });
});
