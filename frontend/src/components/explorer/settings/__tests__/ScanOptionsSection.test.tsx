import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../../../i18n";
import { ScanOptionsSection } from "../ScanOptionsSection";
import { useSettingsStore } from "../../../../stores/settingsStore";

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ include_hidden: false, include_system: false, exclude: [] });
});

describe("ScanOptionsSection", () => {
  it("reflects current store state", () => {
    useSettingsStore.setState({ include_hidden: true, include_system: false });
    render(<ScanOptionsSection />);
    const hidden = screen.getByRole("checkbox", { name: /include hidden/i });
    const system = screen.getByRole("checkbox", { name: /include system/i });
    expect(hidden).toBeChecked();
    expect(system).not.toBeChecked();
  });

  it("toggles include_hidden on click", async () => {
    const user = userEvent.setup();
    render(<ScanOptionsSection />);
    await user.click(screen.getByRole("checkbox", { name: /include hidden/i }));
    expect(useSettingsStore.getState().include_hidden).toBe(true);
  });

  it("toggles include_system on click", async () => {
    const user = userEvent.setup();
    render(<ScanOptionsSection />);
    await user.click(screen.getByRole("checkbox", { name: /include system/i }));
    expect(useSettingsStore.getState().include_system).toBe(true);
  });
});
