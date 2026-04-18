import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorPanel } from "../ErrorPanel";

describe("ErrorPanel", () => {
  it("renders title and message", () => {
    render(<ErrorPanel title="Boom" message="Something exploded." />);
    expect(screen.getByText("Boom")).toBeInTheDocument();
    expect(screen.getByText("Something exploded.")).toBeInTheDocument();
  });

  it("fires onRetry when the retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(
      <ErrorPanel
        title="Boom"
        message="Try again?"
        onRetry={onRetry}
        retryLabel="Retry"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("hides the retry button when onRetry is omitted", () => {
    render(<ErrorPanel title="Boom" message="No retry." />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("exposes role=alert for screen readers", () => {
    render(<ErrorPanel title="Boom" message="Oh no." />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
