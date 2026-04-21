import { describe, it, expect } from "vitest";
import { buildSegments, parentOf } from "../breadcrumbUtils";

describe("breadcrumbUtils.buildSegments", () => {
  it("returns a single segment for the scan root itself", () => {
    const segments = buildSegments("C:\\Users\\usuario", "C:\\Users\\usuario");
    expect(segments).toEqual([{ name: "usuario", path: "C:\\Users\\usuario" }]);
  });

  it("splits a Windows path below the root into accumulating segments", () => {
    const segments = buildSegments(
      "C:\\Users\\usuario",
      "C:\\Users\\usuario\\Documents\\Argos",
    );
    expect(segments).toEqual([
      { name: "usuario", path: "C:\\Users\\usuario" },
      { name: "Documents", path: "C:\\Users\\usuario\\Documents" },
      { name: "Argos", path: "C:\\Users\\usuario\\Documents\\Argos" },
    ]);
  });

  it("splits a POSIX path below the root", () => {
    const segments = buildSegments("/home/user", "/home/user/code/argos");
    expect(segments).toEqual([
      { name: "user", path: "/home/user" },
      { name: "code", path: "/home/user/code" },
      { name: "argos", path: "/home/user/code/argos" },
    ]);
  });

  it("ignores trailing separators in either input", () => {
    const segments = buildSegments("C:\\Users\\u\\", "C:\\Users\\u\\Docs\\");
    expect(segments).toEqual([
      { name: "u", path: "C:\\Users\\u" },
      { name: "Docs", path: "C:\\Users\\u\\Docs" },
    ]);
  });

  it("falls back to a single root segment when current path is outside the root", () => {
    const segments = buildSegments("C:\\A", "D:\\Other\\Path");
    expect(segments).toEqual([{ name: "A", path: "C:\\A" }]);
  });

  it("uses a drive label when the root is a drive like C:\\", () => {
    const segments = buildSegments("C:\\", "C:\\Windows\\System32");
    expect(segments).toEqual([
      { name: "C:\\", path: "C:\\" },
      { name: "Windows", path: "C:\\Windows" },
      { name: "System32", path: "C:\\Windows\\System32" },
    ]);
  });
});

describe("breadcrumbUtils.parentOf", () => {
  it("returns null when current path equals the scan root", () => {
    expect(parentOf("C:\\Users\\usuario", "C:\\Users\\usuario")).toBeNull();
  });

  it("returns the parent directory for a Windows path below root", () => {
    expect(
      parentOf(
        "C:\\Users\\usuario\\Documents\\Argos",
        "C:\\Users\\usuario",
      ),
    ).toBe("C:\\Users\\usuario\\Documents");
  });

  it("clamps to the scan root when the immediate parent would fall outside", () => {
    expect(
      parentOf("C:\\Users\\usuario\\Docs", "C:\\Users\\usuario\\Docs"),
    ).toBeNull();
  });

  it("returns the parent for a POSIX path", () => {
    expect(parentOf("/home/user/code/argos", "/home/user")).toBe(
      "/home/user/code",
    );
  });

  it("returns null when current path is outside the scan root", () => {
    expect(parentOf("D:\\Other", "C:\\Users")).toBeNull();
  });

  it("tolerates trailing separators on either argument", () => {
    expect(parentOf("C:\\A\\B\\", "C:\\A\\")).toBe("C:\\A");
  });
});
