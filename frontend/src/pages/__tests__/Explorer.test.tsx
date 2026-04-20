import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Explorer } from "../Explorer";
import { useScanStore } from "../../stores/scanStore";
import { useExplorerStore } from "../../stores/explorerStore";
import {
  useColumnWidthsStore,
  LEFT_DEFAULT,
  RIGHT_DEFAULT,
} from "../../stores/columnWidthsStore";
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
  useColumnWidthsStore.setState({ left: LEFT_DEFAULT, right: RIGHT_DEFAULT });
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

describe("Explorer resizable columns (M13 §2)", () => {
  it("renders two vertical separators between the three columns", async () => {
    render(
      <MemoryRouter>
        <Explorer />
      </MemoryRouter>,
    );
    await screen.findByText("explorer.foldersPanel");
    const separators = screen.getAllByRole("separator");
    const vertical = separators.filter((s) => s.getAttribute("aria-orientation") === "vertical");
    expect(vertical).toHaveLength(2);
  });

  it("separators are labeled for left and right panels", async () => {
    render(
      <MemoryRouter>
        <Explorer />
      </MemoryRouter>,
    );
    await screen.findByText("explorer.foldersPanel");
    expect(screen.getByRole("separator", { name: /explorer\.a11y\.resizeLeft/ })).toBeInTheDocument();
    expect(screen.getByRole("separator", { name: /explorer\.a11y\.resizeRight/ })).toBeInTheDocument();
  });

  it("ArrowRight on left handle grows the left panel width in the store", async () => {
    render(
      <MemoryRouter>
        <Explorer />
      </MemoryRouter>,
    );
    await screen.findByText("explorer.foldersPanel");
    const leftHandle = screen.getByRole("separator", { name: /explorer\.a11y\.resizeLeft/ });
    fireEvent.keyDown(leftHandle, { key: "ArrowRight" });
    expect(useColumnWidthsStore.getState().left).toBe(LEFT_DEFAULT + 16);
  });

  it("ArrowLeft on right handle grows the right panel width in the store", async () => {
    render(
      <MemoryRouter>
        <Explorer />
      </MemoryRouter>,
    );
    await screen.findByText("explorer.foldersPanel");
    const rightHandle = screen.getByRole("separator", { name: /explorer\.a11y\.resizeRight/ });
    fireEvent.keyDown(rightHandle, { key: "ArrowLeft" });
    expect(useColumnWidthsStore.getState().right).toBe(RIGHT_DEFAULT + 16);
  });

  it("left panel uses inline width matching the store value", async () => {
    act(() => useColumnWidthsStore.setState({ left: 280 }));
    render(
      <MemoryRouter>
        <Explorer />
      </MemoryRouter>,
    );
    const leftPanel = await screen.findByRole("navigation", {
      name: /explorer\.a11y\.tree/,
    });
    const el = leftPanel.closest("[style]") as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el!.style.width).toBe("280px");
  });
});
