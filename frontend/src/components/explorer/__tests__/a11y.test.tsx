import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import { Home } from "../../../pages/Home";
import { Explorer } from "../../../pages/Explorer";
import { useScanStore } from "../../../stores/scanStore";
import { useExplorerStore } from "../../../stores/explorerStore";
import type { LevelScanResult } from "../../../lib/types";

const ROOT_LEVEL: LevelScanResult = {
  rootPath: "/root",
  folderPath: "/root",
  scannedAt: "2026-04-18T00:00:00",
  durationSeconds: 0.1,
  accessible: true,
  isLink: false,
  directFiles: 1,
  directFolders: 0,
  directBytesKnown: 50,
  errorCount: 0,
  optionsHash: "abc",
  children: [
    {
      name: "child",
      path: "/root/child",
      nodeType: "file",
      size: 50,
      accessible: true,
      isLink: false,
      linkTarget: null,
    },
  ],
};

const AXE_CONFIG = {
  rules: {
    // jsdom has no computed styles → contrast checks are unreliable here.
    "color-contrast": { enabled: false },
  },
};

describe("a11y smoke", () => {
  beforeEach(() => {
    useScanStore.setState({
      root: null,
      selectedPath: "",
      levels: {},
      inflight: new Set<string>(),
      errors: {},
      status: "idle",
      errorMessage: "",
    });
    useExplorerStore.setState({ viewMode: "columns", focusedPath: null });
  });

  it("Home has no axe violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    const results = await axe(container, AXE_CONFIG);
    expect(results).toHaveNoViolations();
  });

  it("Explorer columns view has no axe violations", async () => {
    useScanStore.setState({
      root: "/root",
      selectedPath: "/root",
      levels: { "/root": ROOT_LEVEL },
      status: "done",
    });
    const { container } = render(
      <MemoryRouter>
        <Explorer />
      </MemoryRouter>,
    );
    const results = await axe(container, AXE_CONFIG);
    expect(results).toHaveNoViolations();
  });
});
