import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Breadcrumbs } from "../Breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders one segment when current path equals the scan root", () => {
    render(
      <Breadcrumbs
        rootPath={"C:\\Users\\u"}
        currentPath={"C:\\Users\\u"}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByText("u")).toBeInTheDocument();
    expect(screen.queryByText("Documents")).not.toBeInTheDocument();
  });

  it("renders every path segment below the root", () => {
    render(
      <Breadcrumbs
        rootPath={"C:\\Users\\u"}
        currentPath={"C:\\Users\\u\\Docs\\Argos"}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByText("u")).toBeInTheDocument();
    expect(screen.getByText("Docs")).toBeInTheDocument();
    expect(screen.getByText("Argos")).toBeInTheDocument();
  });

  it("calls onNavigate with the full accumulated path when a segment is clicked", () => {
    const onNavigate = vi.fn();
    render(
      <Breadcrumbs
        rootPath={"C:\\Users\\u"}
        currentPath={"C:\\Users\\u\\Docs\\Argos"}
        onNavigate={onNavigate}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Docs" }));
    expect(onNavigate).toHaveBeenCalledWith("C:\\Users\\u\\Docs");
  });

  it("renders the last segment as non-clickable with aria-current", () => {
    render(
      <Breadcrumbs
        rootPath={"C:\\Users\\u"}
        currentPath={"C:\\Users\\u\\Docs\\Argos"}
        onNavigate={vi.fn()}
      />,
    );
    const current = screen.getByText("Argos");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).toBe("SPAN");
  });

  it("disables the go-up button when already at the scan root", () => {
    render(
      <Breadcrumbs
        rootPath={"C:\\Users\\u"}
        currentPath={"C:\\Users\\u"}
        onNavigate={vi.fn()}
      />,
    );
    const up = screen.getByRole("button", { name: /explorer\.contents\.goUp/ });
    expect(up).toBeDisabled();
  });

  it("go-up button navigates to the parent directory", () => {
    const onNavigate = vi.fn();
    render(
      <Breadcrumbs
        rootPath={"C:\\Users\\u"}
        currentPath={"C:\\Users\\u\\Docs\\Argos"}
        onNavigate={onNavigate}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /explorer\.contents\.goUp/ }));
    expect(onNavigate).toHaveBeenCalledWith("C:\\Users\\u\\Docs");
  });
});
