import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders icon, headline and subtext", () => {
    render(
      <EmptyState icon={FolderOpen} headline="Nothing here" subtext="Pick a folder to begin." />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Pick a folder to begin.")).toBeInTheDocument();
  });

  it("renders a CTA button and fires onClick", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={FolderOpen}
        headline="Empty"
        cta={{ label: "Pick folder", onClick }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Pick folder" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not render a button when cta is omitted", () => {
    render(<EmptyState icon={FolderOpen} headline="Empty" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
