import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireScan } from "../RequireScan";
import { useScanStore } from "../../../stores/scanStore";
import type { ScanResult } from "../../../lib/types";

const MOCK_RESULT: ScanResult = {
  root: {
    name: "test",
    path: "C:/test",
    node_type: "folder",
    size: 1024,
    accessible: true,
    is_link: false,
    link_target: null,
    children: [],
  },
  scanned_at: "2026-04-18T00:00:00",
  duration_seconds: 1,
  total_files: 1,
  total_folders: 1,
  total_size: 1024,
  error_count: 0,
};

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/explorer"
          element={
            <RequireScan>
              <div>Explorer content</div>
            </RequireScan>
          }
        />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useScanStore.setState({ result: null, status: "idle" });
});

describe("RequireScan", () => {
  it("renders children when scan result exists", () => {
    useScanStore.setState({ result: MOCK_RESULT, status: "done" });
    renderWithRouter("/explorer");
    expect(screen.getByText("Explorer content")).toBeInTheDocument();
  });

  it("redirects to home when result is null", () => {
    renderWithRouter("/explorer");
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Explorer content")).not.toBeInTheDocument();
  });
});
