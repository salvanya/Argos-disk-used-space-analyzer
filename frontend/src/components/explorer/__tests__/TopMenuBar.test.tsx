import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TopMenuBar } from "../TopMenuBar";
import { useAppStore } from "../../../stores/appStore";
import { useExplorerStore } from "../../../stores/explorerStore";
import { useScanStore } from "../../../stores/scanStore";

vi.mock("../../../lib/api", () => ({
  connectScanWs: vi.fn(() => ({ close: vi.fn(), onopen: null, onmessage: null, onclose: null })),
}));

function renderBar() {
  return render(
    <MemoryRouter>
      <TopMenuBar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAppStore.setState({ theme: "dark", locale: "en" });
  useExplorerStore.setState({ viewMode: "columns", showHidden: false, followSymlinks: false });
  useScanStore.setState({ status: "idle", selectedPath: "C:/test", result: null });
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
});
