import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeleteConfirmModal } from "../DeleteConfirmModal";

describe("DeleteConfirmModal", () => {
  const defaultProps = {
    name: "bigfile.mp4",
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  it("renders the item name", () => {
    render(<DeleteConfirmModal {...defaultProps} />);
    expect(screen.getByText(/bigfile\.mp4/)).toBeInTheDocument();
  });

  it("Cancel button calls onClose without calling onConfirm", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<DeleteConfirmModal name="x.txt" onClose={onClose} onConfirm={onConfirm} />);
    // i18n key returned as-is: "explorer.contents.deleteConfirm.cancel"
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Confirm button calls onConfirm with permanent=false by default", () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmModal name="x.txt" onClose={vi.fn()} onConfirm={onConfirm} />);
    // i18n key returned as-is: "explorer.contents.deleteConfirm.confirm" (not "cancel")
    fireEvent.click(screen.getByRole("button", { name: "explorer.contents.deleteConfirm.confirm" }));
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it("permanent checkbox is unchecked by default and warning is hidden", () => {
    render(<DeleteConfirmModal {...defaultProps} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    // i18n key: "explorer.contents.deleteConfirm.cannotBeUndone"
    expect(screen.queryByText(/cannotBeUndone/i)).not.toBeInTheDocument();
  });

  it("checking permanent checkbox shows cannot-be-undone warning", () => {
    render(<DeleteConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText(/cannotBeUndone/i)).toBeInTheDocument();
  });

  it("confirming with checkbox checked calls onConfirm with permanent=true", () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirmModal name="x.txt" onClose={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "explorer.contents.deleteConfirm.confirm" }));
    expect(onConfirm).toHaveBeenCalledWith(true);
  });
});
