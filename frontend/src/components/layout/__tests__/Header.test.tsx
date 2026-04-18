import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "../Header";
import { useAppStore } from "../../../stores/appStore";

function renderHeader() {
  return render(<Header />);
}

beforeEach(() => {
  useAppStore.setState({ theme: "dark", locale: "en", isAdmin: false });
  document.documentElement.classList.remove("light");
  localStorage.clear();
});

describe("Header", () => {
  it("renders a theme toggle button", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /theme/i })).toBeInTheDocument();
  });

  it("renders a language toggle button", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /language/i })).toBeInTheDocument();
  });

  it("theme toggle switches dark to light", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole("button", { name: /theme/i }));
    expect(useAppStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("theme toggle switches light back to dark", async () => {
    useAppStore.setState({ theme: "light" });
    document.documentElement.classList.add("light");
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole("button", { name: /theme/i }));
    expect(useAppStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("language toggle switches en to es", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole("button", { name: /language/i }));
    expect(useAppStore.getState().locale).toBe("es");
  });
});
