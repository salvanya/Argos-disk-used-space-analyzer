import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../../i18n";
import { RelaunchAdminButton } from "../RelaunchAdminButton";
import { useAppStore } from "../../../stores/appStore";

const relaunchAdmin = vi.fn();
vi.mock("../../../lib/api", () => ({
  relaunchAdmin: () => relaunchAdmin(),
}));

beforeEach(() => {
  relaunchAdmin.mockReset();
  useAppStore.setState({ isAdmin: false, platform: "win32" });
});

describe("RelaunchAdminButton", () => {
  it("renders nothing on non-Windows", () => {
    useAppStore.setState({ platform: "linux" });
    const { container } = render(<RelaunchAdminButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when already admin", () => {
    useAppStore.setState({ isAdmin: true });
    const { container } = render(<RelaunchAdminButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders on Windows when not elevated", () => {
    render(<RelaunchAdminButton />);
    expect(screen.getByRole("button", { name: /relaunch as administrator/i })).toBeInTheDocument();
  });

  it("opens a confirmation dialog and invokes relaunchAdmin on confirm", async () => {
    relaunchAdmin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RelaunchAdminButton />);
    await user.click(screen.getByRole("button", { name: /relaunch as administrator/i }));
    const confirm = await screen.findByRole("button", { name: /^relaunch$/i });
    await user.click(confirm);
    expect(relaunchAdmin).toHaveBeenCalledOnce();
  });

  it("surfaces uacDeclined error in the dialog body", async () => {
    relaunchAdmin.mockRejectedValue(new Error("errors.uacDeclined"));
    const user = userEvent.setup();
    render(<RelaunchAdminButton />);
    await user.click(screen.getByRole("button", { name: /relaunch as administrator/i }));
    const confirm = await screen.findByRole("button", { name: /^relaunch$/i });
    await user.click(confirm);
    expect(await screen.findByText(/elevation prompt was declined/i)).toBeInTheDocument();
  });
});
