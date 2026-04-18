import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Explorer } from "../Explorer";
import { useScanStore } from "../../stores/scanStore";
import { useExplorerStore } from "../../stores/explorerStore";
import type { ScanResult } from "../../lib/types";

const RESULT: ScanResult = {
  root: {
    name: "root",
    path: "/root",
    node_type: "folder",
    size: 100,
    accessible: true,
    is_link: false,
    link_target: null,
    children: [
      {
        name: "a",
        path: "/root/a",
        node_type: "file",
        size: 50,
        accessible: true,
        is_link: false,
        link_target: null,
        children: [],
      },
    ],
  },
  scanned_at: "2026-04-18T00:00:00",
  duration_seconds: 1,
  total_files: 1,
  total_folders: 1,
  total_size: 100,
  error_count: 0,
};

beforeEach(() => {
  useScanStore.setState({ result: RESULT, status: "done" });
  useExplorerStore.setState({ viewMode: "columns", focusedPath: null });
});

describe("Explorer view mode", () => {
  it("renders column layout by default", async () => {
    render(
      <MemoryRouter>
        <Explorer />
      </MemoryRouter>,
    );
    // Wait for lazy-loaded panels to resolve
    expect(await screen.findByText("explorer.foldersPanel")).toBeInTheDocument();
    expect(screen.queryByTestId("force-graph-3d")).not.toBeInTheDocument();
  });

  it("renders the 3D graph when viewMode is '3d'", async () => {
    render(
      <MemoryRouter>
        <Explorer />
      </MemoryRouter>,
    );
    await screen.findByText("explorer.foldersPanel");
    act(() => useExplorerStore.getState().setViewMode("3d"));
    expect(await screen.findByTestId("force-graph-3d")).toBeInTheDocument();
    expect(screen.queryByText("explorer.foldersPanel")).not.toBeInTheDocument();
  });
});
