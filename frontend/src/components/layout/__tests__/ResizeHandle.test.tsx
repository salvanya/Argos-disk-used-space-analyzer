import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResizeHandle } from "../ResizeHandle";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ResizeHandle", () => {
  it("renders with role=separator and aria-orientation=vertical", () => {
    render(
      <ResizeHandle
        current={240}
        onChange={() => {}}
        min={180}
        max={400}
        ariaLabel="Resize left panel"
      />,
    );
    const handle = screen.getByRole("separator");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-label", "Resize left panel");
  });

  it("exposes aria-valuenow / valuemin / valuemax for screen readers", () => {
    render(
      <ResizeHandle
        current={240}
        onChange={() => {}}
        min={180}
        max={400}
        ariaLabel="l"
      />,
    );
    const handle = screen.getByRole("separator");
    expect(handle).toHaveAttribute("aria-valuenow", "240");
    expect(handle).toHaveAttribute("aria-valuemin", "180");
    expect(handle).toHaveAttribute("aria-valuemax", "400");
  });

  it("ArrowRight bumps width by +16 via onChange (from-left=true)", () => {
    const onChange = vi.fn();
    render(
      <ResizeHandle
        current={240}
        onChange={onChange}
        min={180}
        max={400}
        ariaLabel="l"
        fromLeft
      />,
    );
    const handle = screen.getByRole("separator");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(256);
  });

  it("ArrowLeft reduces width by -16 via onChange (from-left=true)", () => {
    const onChange = vi.fn();
    render(
      <ResizeHandle
        current={240}
        onChange={onChange}
        min={180}
        max={400}
        ariaLabel="l"
        fromLeft
      />,
    );
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith(224);
  });

  it("ArrowLeft increases width when fromLeft is false (right panel grows left)", () => {
    const onChange = vi.fn();
    render(
      <ResizeHandle
        current={320}
        onChange={onChange}
        min={240}
        max={480}
        ariaLabel="r"
        fromLeft={false}
      />,
    );
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith(336);
  });

  it("Home resets width to min, End to max", () => {
    const onChange = vi.fn();
    render(
      <ResizeHandle
        current={240}
        onChange={onChange}
        min={180}
        max={400}
        ariaLabel="l"
        fromLeft
      />,
    );
    fireEvent.keyDown(screen.getByRole("separator"), { key: "Home" });
    expect(onChange).toHaveBeenCalledWith(180);
    fireEvent.keyDown(screen.getByRole("separator"), { key: "End" });
    expect(onChange).toHaveBeenCalledWith(400);
  });

  it("pointerdown + pointermove drags width (fromLeft panel grows as cursor moves right)", () => {
    const onChange = vi.fn();
    render(
      <ResizeHandle
        current={240}
        onChange={onChange}
        min={180}
        max={400}
        ariaLabel="l"
        fromLeft
      />,
    );
    const handle = screen.getByRole("separator");
    fireEvent.pointerDown(handle, { clientX: 240, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 260, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(260);
    fireEvent.pointerUp(window, { pointerId: 1 });
  });

  it("pointermove on fromLeft=false shrinks width as cursor moves right", () => {
    const onChange = vi.fn();
    render(
      <ResizeHandle
        current={320}
        onChange={onChange}
        min={240}
        max={480}
        ariaLabel="r"
        fromLeft={false}
      />,
    );
    const handle = screen.getByRole("separator");
    fireEvent.pointerDown(handle, { clientX: 500, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 530, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(290);
    fireEvent.pointerUp(window, { pointerId: 1 });
  });

  it("invisible-until-hover: handle has 0 visible body that appears on hover (spec §2)", () => {
    render(
      <ResizeHandle
        current={240}
        onChange={() => {}}
        min={180}
        max={400}
        ariaLabel="l"
      />,
    );
    const handle = screen.getByRole("separator");
    // Either the handle itself is invisible with a hover indicator,
    // or it hosts an indicator child that uses opacity-0/hover:opacity-*.
    // We assert the class list mentions opacity transitions to enforce the
    // invisible-until-hover behavior without dictating exact structure.
    const hasOpacityTransition =
      /opacity-0/.test(handle.className) ||
      Array.from(handle.querySelectorAll("*")).some((el) => /opacity-0/.test(el.className));
    expect(hasOpacityTransition).toBe(true);
  });
});
