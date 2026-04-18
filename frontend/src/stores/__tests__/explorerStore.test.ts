import { describe, it, expect, beforeEach } from "vitest";
import { useExplorerStore } from "../explorerStore";

beforeEach(() => {
  useExplorerStore.setState({
    viewMode: "columns",
    showHidden: false,
    followSymlinks: false,
  });
});

describe("explorerStore", () => {
  it("has correct initial state", () => {
    const s = useExplorerStore.getState();
    expect(s.viewMode).toBe("columns");
    expect(s.showHidden).toBe(false);
    expect(s.followSymlinks).toBe(false);
  });

  it("toggleHidden flips showHidden", () => {
    useExplorerStore.getState().toggleHidden();
    expect(useExplorerStore.getState().showHidden).toBe(true);
    useExplorerStore.getState().toggleHidden();
    expect(useExplorerStore.getState().showHidden).toBe(false);
  });

  it("toggleSymlinks flips followSymlinks", () => {
    useExplorerStore.getState().toggleSymlinks();
    expect(useExplorerStore.getState().followSymlinks).toBe(true);
    useExplorerStore.getState().toggleSymlinks();
    expect(useExplorerStore.getState().followSymlinks).toBe(false);
  });

  it("setViewMode updates viewMode", () => {
    useExplorerStore.getState().setViewMode("3d");
    expect(useExplorerStore.getState().viewMode).toBe("3d");
    useExplorerStore.getState().setViewMode("columns");
    expect(useExplorerStore.getState().viewMode).toBe("columns");
  });
});
