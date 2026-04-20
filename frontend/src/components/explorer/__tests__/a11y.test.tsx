import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "jest-axe";
import { Home } from "../../../pages/Home";
import { Explorer } from "../../../pages/Explorer";
import { useScanStore } from "../../../stores/scanStore";
import { useExplorerStore } from "../../../stores/explorerStore";
import type { ScanResult } from "../../../lib/types";

const RESULT: ScanResult = {
  root: {
    name: "root",
    path: "/root",
    node_type: "folder",
    size: 100,
    accessible: true,
    is_link: false,
    link_target: null,
    children: [
      {
        name: "child",
        path: "/root/child",
        node_type: "file",
        size: 50,
        accessible: true,
        is_link: false,
        link_target: null,
        children: [],
      },
    ],
  },
  scanned_at: "2026-04-18T00:00:00",
  duration_seconds: 1,
  total_files: 1,
  total_folders: 1,
  total_size: 100,
  error_count: 0,
};

const AXE_CONFIG = {
  rules: {
    // jsdom has no computed styles → contrast checks are unreliable here.
    "color-contrast": { enabled: false },
  },
};

describe("a11y smoke", () => {
  beforeEach(() => {
    useScanStore.setState({ result: null, status: "idle" });
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
    useScanStore.setState({ result: RESULT, status: "done" });
    const { container } = render(
      <MemoryRouter>
        <Explorer />
      </MemoryRouter>,
    );
    const results = await axe(container, AXE_CONFIG);
    expect(results).toHaveNoViolations();
  });
});
