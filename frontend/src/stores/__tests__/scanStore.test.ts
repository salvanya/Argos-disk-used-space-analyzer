import { describe, it, expect, beforeEach, vi } from "vitest";
import { useScanStore } from "../scanStore";
import type { LevelScanResult } from "../../lib/types";

const scanLevel = vi.fn();
const invalidateLevel = vi.fn();

vi.mock("../../lib/api", () => ({
  scanLevel: (...args: unknown[]) => scanLevel(...args),
  invalidateLevel: (...args: unknown[]) => invalidateLevel(...args),
}));

function makeLevel(overrides: Partial<LevelScanResult> = {}): LevelScanResult {
  return {
    rootPath: "/root",
    folderPath: "/root",
    scannedAt: "2026-04-19T00:00:00Z",
    durationSeconds: 0.01,
    accessible: true,
    isLink: false,
    directFiles: 0,
    directFolders: 0,
    directBytesKnown: 0,
    errorCount: 0,
    children: [],
    optionsHash: "abc123",
    ...overrides,
  };
}

beforeEach(() => {
  scanLevel.mockReset();
  invalidateLevel.mockReset();
  useScanStore.setState({
    root: null,
    selectedPath: "",
    levels: {},
    inflight: new Set<string>(),
    errors: {},
  });
});

describe("scanStore — openRoot", () => {
  it("calls scanLevel once and stores the level under levels[rootPath]", async () => {
    const result = makeLevel({ rootPath: "/root", folderPath: "/root", directFiles: 3 });
    scanLevel.mockResolvedValueOnce(result);

    await useScanStore.getState().openRoot("/root");

    expect(scanLevel).toHaveBeenCalledTimes(1);
    expect(scanLevel).toHaveBeenCalledWith("/root", "/root", expect.any(Object), false);
    const s = useScanStore.getState();
    expect(s.root).toBe("/root");
    expect(s.selectedPath).toBe("/root");
    expect(s.levels["/root"]).toEqual(result);
    expect(s.inflight.has("/root")).toBe(false);
  });
});

describe("scanStore — ensureLevel", () => {
  it("cache-hit does not call the API", async () => {
    const cached = makeLevel({ rootPath: "/root", folderPath: "/root/a" });
    useScanStore.setState({
      root: "/root",
      levels: { "/root/a": cached },
    });

    await useScanStore.getState().ensureLevel("/root/a");

    expect(scanLevel).not.toHaveBeenCalled();
  });

  it("dedupes concurrent calls — two parallel ensureLevel → one fetch", async () => {
    useScanStore.setState({ root: "/root" });
    let resolveFn!: (v: LevelScanResult) => void;
    scanLevel.mockReturnValueOnce(
      new Promise<LevelScanResult>((r) => {
        resolveFn = r;
      }),
    );

    const p1 = useScanStore.getState().ensureLevel("/root/a");
    const p2 = useScanStore.getState().ensureLevel("/root/a");
    expect(useScanStore.getState().inflight.has("/root/a")).toBe(true);

    resolveFn(makeLevel({ rootPath: "/root", folderPath: "/root/a" }));
    await Promise.all([p1, p2]);

    expect(scanLevel).toHaveBeenCalledTimes(1);
    expect(useScanStore.getState().inflight.has("/root/a")).toBe(false);
    expect(useScanStore.getState().levels["/root/a"]).toBeDefined();
  });

  it("error populates errors map and clears inflight", async () => {
    useScanStore.setState({ root: "/root" });
    scanLevel.mockRejectedValueOnce(new Error("boom"));

    await useScanStore.getState().ensureLevel("/root/a");

    const s = useScanStore.getState();
    expect(s.errors["/root/a"]).toBe("boom");
    expect(s.inflight.has("/root/a")).toBe(false);
    expect(s.levels["/root/a"]).toBeUndefined();
  });
});

describe("scanStore — invalidateLevel", () => {
  it("recursive removes the path and descendants", async () => {
    invalidateLevel.mockResolvedValueOnce(undefined);
    useScanStore.setState({
      root: "/root",
      levels: {
        "/root": makeLevel({ folderPath: "/root" }),
        "/root/a": makeLevel({ folderPath: "/root/a" }),
        "/root/a/b": makeLevel({ folderPath: "/root/a/b" }),
        "/root/a/c": makeLevel({ folderPath: "/root/a/c" }),
        "/root/x": makeLevel({ folderPath: "/root/x" }),
      },
    });

    await useScanStore.getState().invalidateLevel("/root/a", true);

    const keys = Object.keys(useScanStore.getState().levels).sort();
    expect(keys).toEqual(["/root", "/root/x"]);
    expect(invalidateLevel).toHaveBeenCalledWith("/root", "/root/a", true);
  });

  it("non-recursive only removes the exact path", async () => {
    invalidateLevel.mockResolvedValueOnce(undefined);
    useScanStore.setState({
      root: "/root",
      levels: {
        "/root/a": makeLevel({ folderPath: "/root/a" }),
        "/root/a/b": makeLevel({ folderPath: "/root/a/b" }),
      },
    });

    await useScanStore.getState().invalidateLevel("/root/a", false);

    const keys = Object.keys(useScanStore.getState().levels).sort();
    expect(keys).toEqual(["/root/a/b"]);
    expect(invalidateLevel).toHaveBeenCalledWith("/root", "/root/a", false);
  });
});

describe("scanStore — removeNode", () => {
  it("splices the child out of the parent-level's children array", () => {
    useScanStore.setState({
      root: "/root",
      levels: {
        "/root/a": makeLevel({
          folderPath: "/root/a",
          children: [
            {
              name: "b",
              path: "/root/a/b",
              nodeType: "folder",
              size: null,
              accessible: true,
              isLink: false,
              linkTarget: null,
            },
            {
              name: "c",
              path: "/root/a/c",
              nodeType: "file",
              size: 42,
              accessible: true,
              isLink: false,
              linkTarget: null,
            },
          ],
        }),
      },
    });

    useScanStore.getState().removeNode("/root/a/b");

    const kids = useScanStore.getState().levels["/root/a"].children;
    expect(kids.map((k) => k.path)).toEqual(["/root/a/c"]);
  });
});

describe("scanStore — closeRoot", () => {
  it("clears root, selectedPath, levels, inflight and errors", () => {
    useScanStore.setState({
      root: "/root",
      selectedPath: "/root/a",
      levels: { "/root": makeLevel() },
      inflight: new Set(["/root/a"]),
      errors: { "/root/a": "oops" },
    });

    useScanStore.getState().closeRoot();

    const s = useScanStore.getState();
    expect(s.root).toBeNull();
    expect(s.selectedPath).toBe("");
    expect(s.levels).toEqual({});
    expect(s.inflight.size).toBe(0);
    expect(s.errors).toEqual({});
  });
});
