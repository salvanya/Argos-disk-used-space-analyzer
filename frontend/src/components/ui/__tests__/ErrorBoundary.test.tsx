import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { ErrorBoundary } from "../ErrorBoundary";

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("kaboom");
  return <span>alive</span>;
}

describe("ErrorBoundary", () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("alive")).toBeInTheDocument();
  });

  it("catches render errors and shows an error panel", () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("resets when the retry button is clicked", async () => {
    function Parent() {
      const [throwIt, setThrowIt] = useState(true);
      return (
        <div>
          <button onClick={() => setThrowIt(false)}>fix</button>
          <ErrorBoundary>
            <Boom shouldThrow={throwIt} />
          </ErrorBoundary>
        </div>
      );
    }
    render(<Parent />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // First fix the underlying cause, then press retry.
    await userEvent.click(screen.getByRole("button", { name: "fix" }));
    await userEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(screen.getByText("alive")).toBeInTheDocument();
  });
});
