import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../../../i18n";
import { SettingsDrawer } from "../SettingsDrawer";
import { useExplorerStore } from "../../../../stores/explorerStore";
import { useSettingsStore } from "../../../../stores/settingsStore";

vi.mock("../../../../lib/api", () => ({
  listScans: vi.fn().mockResolvedValue([]),
  deleteScan: vi.fn(),
  deleteAllScans: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ include_hidden: false, include_system: false, exclude: [] });
  useExplorerStore.setState({ settingsOpen: false });
});

describe("SettingsDrawer", () => {
  it("renders nothing when closed", () => {
    render(<SettingsDrawer />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders all three sections when open", () => {
    useExplorerStore.setState({ settingsOpen: true });
    render(<SettingsDrawer />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/scan options/i)).toBeInTheDocument();
    expect(screen.getByText(/^exclusions$/i)).toBeInTheDocument();
    expect(screen.getByText(/^cache$/i)).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    useExplorerStore.setState({ settingsOpen: true });
    const user = userEvent.setup();
    render(<SettingsDrawer />);
    await user.keyboard("{Escape}");
    expect(useExplorerStore.getState().settingsOpen).toBe(false);
  });

  it("closes when clicking the close button", async () => {
    useExplorerStore.setState({ settingsOpen: true });
    const user = userEvent.setup();
    render(<SettingsDrawer />);
    await user.click(screen.getByRole("button", { name: /close settings/i }));
    expect(useExplorerStore.getState().settingsOpen).toBe(false);
  });
});
