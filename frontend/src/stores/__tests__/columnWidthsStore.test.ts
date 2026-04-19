import { describe, it, expect, beforeEach } from "vitest";
import {
  useColumnWidthsStore,
  LEFT_MIN,
  LEFT_MAX,
  RIGHT_MIN,
  RIGHT_MAX,
  LEFT_DEFAULT,
  RIGHT_DEFAULT,
} from "../columnWidthsStore";

beforeEach(() => {
  localStorage.clear();
  useColumnWidthsStore.setState({ left: LEFT_DEFAULT, right: RIGHT_DEFAULT });
});

describe("columnWidthsStore", () => {
  it("exposes sane defaults", () => {
    const s = useColumnWidthsStore.getState();
    expect(s.left).toBe(LEFT_DEFAULT);
    expect(s.right).toBe(RIGHT_DEFAULT);
  });

  it("setLeft clamps below minimum", () => {
    useColumnWidthsStore.getState().setLeft(LEFT_MIN - 50);
    expect(useColumnWidthsStore.getState().left).toBe(LEFT_MIN);
  });

  it("setLeft clamps above maximum", () => {
    useColumnWidthsStore.getState().setLeft(LEFT_MAX + 200);
    expect(useColumnWidthsStore.getState().left).toBe(LEFT_MAX);
  });

  it("setRight clamps below minimum and above maximum", () => {
    useColumnWidthsStore.getState().setRight(RIGHT_MIN - 10);
    expect(useColumnWidthsStore.getState().right).toBe(RIGHT_MIN);
    useColumnWidthsStore.getState().setRight(RIGHT_MAX + 100);
    expect(useColumnWidthsStore.getState().right).toBe(RIGHT_MAX);
  });

  it("persists widths to localStorage on setLeft", () => {
    useColumnWidthsStore.getState().setLeft(260);
    const raw = localStorage.getItem("argos-column-widths");
    expect(raw).toBeTruthy();
    expect(raw!).toContain('"left":260');
  });

  it("persists widths to localStorage on setRight", () => {
    useColumnWidthsStore.getState().setRight(360);
    const raw = localStorage.getItem("argos-column-widths");
    expect(raw!).toContain('"right":360');
  });

  it("reset returns to defaults and persists", () => {
    const s = useColumnWidthsStore.getState();
    s.setLeft(LEFT_MIN);
    s.setRight(RIGHT_MAX);
    s.reset();
    const after = useColumnWidthsStore.getState();
    expect(after.left).toBe(LEFT_DEFAULT);
    expect(after.right).toBe(RIGHT_DEFAULT);
    expect(localStorage.getItem("argos-column-widths")).toContain(`"left":${LEFT_DEFAULT}`);
  });
});
