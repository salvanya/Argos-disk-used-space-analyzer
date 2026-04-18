import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "../../../i18n";
import { AdminBadge } from "../AdminBadge";
import { useAppStore } from "../../../stores/appStore";

beforeEach(() => {
  useAppStore.setState({ isAdmin: false, platform: "win32" });
});

describe("AdminBadge", () => {
  it("renders the 'standard user' label when not elevated", () => {
    useAppStore.setState({ isAdmin: false });
    render(<AdminBadge />);
    expect(screen.getByRole("status")).toHaveAccessibleName(/standard user/i);
  });

  it("renders the 'elevated' label when admin", () => {
    useAppStore.setState({ isAdmin: true });
    render(<AdminBadge />);
    expect(screen.getByRole("status")).toHaveAccessibleName(/administrator/i);
  });
});
