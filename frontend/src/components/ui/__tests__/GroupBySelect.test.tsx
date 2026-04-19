import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GroupBySelect } from "../GroupBySelect";

const OPTIONS = [
  { value: "none", label: "No grouping" },
  { value: "type", label: "Group by type" },
];

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("GroupBySelect", () => {
  it("renders a trigger button showing the current option label", () => {
    const onChange = vi.fn();
    render(<GroupBySelect value="none" onChange={onChange} options={OPTIONS} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("No grouping");
  });

  it("trigger has aria-haspopup=listbox and aria-expanded=false when closed", () => {
    render(<GroupBySelect value="none" onChange={vi.fn()} options={OPTIONS} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking the trigger opens a listbox with all options", () => {
    render(<GroupBySelect value="none" onChange={vi.fn()} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  it("the option matching value has aria-selected=true", () => {
    render(<GroupBySelect value="type" onChange={vi.fn()} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("combobox"));
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("clicking an option fires onChange with its value and closes the popover", () => {
    const onChange = vi.fn();
    render(<GroupBySelect value="none" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /group by type/i }));
    expect(onChange).toHaveBeenCalledWith("type");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("Escape closes the popover", () => {
    render(<GroupBySelect value="none" onChange={vi.fn()} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ArrowDown on trigger opens the listbox", () => {
    render(<GroupBySelect value="none" onChange={vi.fn()} options={OPTIONS} />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("ArrowDown / ArrowUp + Enter selects the next option", () => {
    const onChange = vi.fn();
    render(<GroupBySelect value="none" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("type");
  });

  it("listbox uses bg-canvas-modal token (equivalent to bg-popover — spec §4)", () => {
    render(<GroupBySelect value="none" onChange={vi.fn()} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("combobox"));
    const listbox = screen.getByRole("listbox");
    expect(listbox.className).toMatch(/bg-canvas-modal/);
  });

  it("clicking outside the listbox closes it", () => {
    render(<GroupBySelect value="none" onChange={vi.fn()} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
