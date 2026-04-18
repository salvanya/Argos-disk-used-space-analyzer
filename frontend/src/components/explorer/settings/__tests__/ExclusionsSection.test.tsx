import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../../../i18n";
import { ExclusionsSection } from "../ExclusionsSection";
import { useSettingsStore } from "../../../../stores/settingsStore";

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ include_hidden: false, include_system: false, exclude: [] });
});

describe("ExclusionsSection", () => {
  it("shows the empty state when no exclusions are set", () => {
    render(<ExclusionsSection />);
    expect(screen.getByText(/Everything is scanned/i)).toBeInTheDocument();
  });

  it("adds a glob via the Add button", async () => {
    const user = userEvent.setup();
    render(<ExclusionsSection />);
    await user.type(screen.getByPlaceholderText(/enter a glob/i), "**/node_modules/**");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(useSettingsStore.getState().exclude).toEqual(["**/node_modules/**"]);
    expect(screen.getByText("**/node_modules/**")).toBeInTheDocument();
  });

  it("adds a glob on Enter", async () => {
    const user = userEvent.setup();
    render(<ExclusionsSection />);
    const input = screen.getByPlaceholderText(/enter a glob/i);
    await user.type(input, "**/*.log{Enter}");
    expect(useSettingsStore.getState().exclude).toContain("**/*.log");
  });

  it("removes a glob via its trash button", async () => {
    useSettingsStore.setState({ exclude: ["**/a/**", "**/b/**"] });
    const user = userEvent.setup();
    render(<ExclusionsSection />);
    await user.click(screen.getByRole("button", { name: /remove.*\*\*\/a\/\*\*/i }));
    expect(useSettingsStore.getState().exclude).toEqual(["**/b/**"]);
  });

  it("ignores empty or whitespace globs", async () => {
    const user = userEvent.setup();
    render(<ExclusionsSection />);
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(useSettingsStore.getState().exclude).toEqual([]);
  });
});
