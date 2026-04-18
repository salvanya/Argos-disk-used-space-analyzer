import { describe, it, expect, beforeEach } from "vitest";
import { useExplorerStore } from "../explorerStore";

beforeEach(() => {
  useExplorerStore.setState({
    viewMode: "columns",
    showHidden: false,
    settingsOpen: false,
  });
});

describe("explorerStore", () => {
  it("has correct initial state", () => {
    const s = useExplorerStore.getState();
    expect(s.viewMode).toBe("columns");
    expect(s.showHidden).toBe(false);
    expect(s.settingsOpen).toBe(false);
  });

  it("toggleHidden flips showHidden", () => {
    useExplorerStore.getState().toggleHidden();
    expect(useExplorerStore.getState().showHidden).toBe(true);
    useExplorerStore.getState().toggleHidden();
    expect(useExplorerStore.getState().showHidden).toBe(false);
  });

  it("setSettingsOpen updates settingsOpen", () => {
    useExplorerStore.getState().setSettingsOpen(true);
    expect(useExplorerStore.getState().settingsOpen).toBe(true);
    useExplorerStore.getState().setSettingsOpen(false);
    expect(useExplorerStore.getState().settingsOpen).toBe(false);
  });

  it("setViewMode updates viewMode", () => {
    useExplorerStore.getState().setViewMode("3d");
    expect(useExplorerStore.getState().viewMode).toBe("3d");
    useExplorerStore.getState().setViewMode("columns");
    expect(useExplorerStore.getState().viewMode).toBe("columns");
  });
});
