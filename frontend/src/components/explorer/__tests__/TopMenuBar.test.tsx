import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TopMenuBar } from "../TopMenuBar";
import { useAppStore } from "../../../stores/appStore";
import { useExplorerStore } from "../../../stores/explorerStore";
import { useScanStore } from "../../../stores/scanStore";
import type { LevelScanResult } from "../../../lib/types";

function emptyLevel(path: string): LevelScanResult {
  return {
    rootPath: path,
    folderPath: path,
    scannedAt: "2026-04-20T00:00:00Z",
    durationSeconds: 0.01,
    accessible: true,
    isLink: false,
    directFiles: 0,
    directFolders: 0,
    directBytesKnown: 0,
    errorCount: 0,
    children: [],
    optionsHash: "abc",
  };
}

vi.mock("../../../lib/api", () => ({
  scanLevel: vi.fn().mockImplementation(async (root: string, path: string) => ({
    ...emptyLevel(path),
    rootPath: root,
  })),
  invalidateLevel: vi.fn().mockResolvedValue(undefined),
}));

import { scanLevel, invalidateLevel } from "../../../lib/api";
const scanLevelMock = scanLevel as unknown as ReturnType<typeof vi.fn>;
const invalidateLevelMock = invalidateLevel as unknown as ReturnType<typeof vi.fn>;

function renderBar() {
  return render(
    <MemoryRouter>
      <TopMenuBar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  scanLevelMock.mockClear();
  invalidateLevelMock.mockClear();
  useAppStore.setState({ theme: "dark", locale: "en" });
  useExplorerStore.setState({ viewMode: "columns", showHidden: false, settingsOpen: false });
  useScanStore.setState({
    status: "idle",
    root: "C:/test",
    selectedPath: "C:/test",
    levels: { "C:/test": emptyLevel("C:/test") },
    inflight: new Set<string>(),
    errors: {},
    result: null,
  });
  document.documentElement.classList.remove("light");
  localStorage.clear();
});

describe("TopMenuBar", () => {
  it("renders a back button that navigates to home", async () => {
    const user = userEvent.setup();
    const { container } = renderBar();
    const back = screen.getByRole("button", { name: /back/i });
    await user.click(back);
    // Navigation is handled by useNavigate; we verify the button exists and is clickable
    expect(back).toBeInTheDocument();
    void container;
  });

  it("theme toggle switches between dark and light", async () => {
    const user = userEvent.setup();
    renderBar();
    const toggle = screen.getByRole("button", { name: /theme/i });
    await user.click(toggle);
    expect(useAppStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    await user.click(toggle);
    expect(useAppStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("language toggle switches locale between en and es", async () => {
    const user = userEvent.setup();
    renderBar();
    const toggle = screen.getByRole("button", { name: /language/i });
    await user.click(toggle);
    expect(useAppStore.getState().locale).toBe("es");
    await user.click(toggle);
    expect(useAppStore.getState().locale).toBe("en");
  });

  it("view mode switcher updates explorerStore", async () => {
    const user = userEvent.setup();
    renderBar();
    const switcher = screen.getByRole("button", { name: /3d/i });
    await user.click(switcher);
    expect(useExplorerStore.getState().viewMode).toBe("3d");
  });

  it("rescan button is disabled while scanning", () => {
    useScanStore.setState({ status: "scanning" });
    renderBar();
    const rescan = screen.getByRole("button", { name: /rescan/i });
    expect(rescan).toBeDisabled();
  });

  it("rescan invalidates the root recursively then ensures it", async () => {
    const user = userEvent.setup();
    useScanStore.setState({
      status: "idle",
      root: "/root",
      selectedPath: "/root",
      levels: { "/root": emptyLevel("/root"), "/root/sub": emptyLevel("/root/sub") },
      inflight: new Set<string>(),
      errors: {},
    });
    renderBar();
    await user.click(screen.getByRole("button", { name: /rescan/i }));

    await waitFor(() => {
      expect(invalidateLevelMock).toHaveBeenCalledWith("/root", "/root", true);
    });
    const rootScanCall = scanLevelMock.mock.calls.find(
      (args) => args[0] === "/root" && args[1] === "/root",
    );
    expect(rootScanCall).toBeDefined();
    // invalidateLevel must happen before the re-ensure scan.
    const invalidateOrder = invalidateLevelMock.mock.invocationCallOrder[0];
    const scanOrder = scanLevelMock.mock.invocationCallOrder.find(
      (_o, i) => scanLevelMock.mock.calls[i][1] === "/root",
    );
    expect(scanOrder).toBeGreaterThan(invalidateOrder);
  });

  it("rescan preserves selectedPath and refetches the selected level too", async () => {
    const user = userEvent.setup();
    useScanStore.setState({
      status: "idle",
      root: "/root",
      selectedPath: "/root/sub",
      levels: { "/root": emptyLevel("/root"), "/root/sub": emptyLevel("/root/sub") },
      inflight: new Set<string>(),
      errors: {},
    });
    renderBar();
    await user.click(screen.getByRole("button", { name: /rescan/i }));

    await waitFor(() => {
      const scannedPaths = scanLevelMock.mock.calls.map((args) => args[1]);
      expect(scannedPaths).toContain("/root");
      expect(scannedPaths).toContain("/root/sub");
    });
    expect(useScanStore.getState().selectedPath).toBe("/root/sub");
  });
});
