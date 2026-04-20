import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../../../../i18n";
import { CacheSection } from "../CacheSection";

const listScans = vi.fn();
const deleteScan = vi.fn();
const deleteAllScans = vi.fn();

vi.mock("../../../../lib/api", () => ({
  listScans: () => listScans(),
  deleteScan: (path: string) => deleteScan(path),
  deleteAllScans: () => deleteAllScans(),
}));

beforeEach(() => {
  listScans.mockReset();
  deleteScan.mockReset();
  deleteAllScans.mockReset();
});

describe("CacheSection", () => {
  it("renders empty state when no scans cached", async () => {
    listScans.mockResolvedValue([]);
    render(<CacheSection />);
    await waitFor(() =>
      expect(screen.getByText(/no cached scans/i)).toBeInTheDocument(),
    );
  });

  it("renders a row per cached scan and deletes one", async () => {
    listScans.mockResolvedValueOnce([
      {
        root_path: "C:/one",
        scanned_at: "2026-04-18T00:00:00Z",
        total_files: 1,
        total_folders: 1,
        total_size: 10,
        error_count: 0,
        duration_seconds: 0.1,
      },
    ]);
    listScans.mockResolvedValueOnce([]);
    deleteScan.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CacheSection />);
    await waitFor(() => expect(screen.getByText("C:/one")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /delete.*C:\/one/i }));
    expect(deleteScan).toHaveBeenCalledWith("C:/one");
  });

  it("clear-all shows confirmation and calls deleteAllScans", async () => {
    listScans.mockResolvedValueOnce([
      {
        root_path: "C:/one",
        scanned_at: "2026-04-18T00:00:00Z",
        total_files: 1,
        total_folders: 1,
        total_size: 10,
        error_count: 0,
        duration_seconds: 0.1,
      },
    ]);
    listScans.mockResolvedValueOnce([]);
    deleteAllScans.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CacheSection />);
    await waitFor(() => expect(screen.getByText("C:/one")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /clear all/i }));
    await user.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(deleteAllScans).toHaveBeenCalledOnce();
  });
});
