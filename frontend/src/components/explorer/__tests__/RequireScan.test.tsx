import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireScan } from "../RequireScan";
import { useScanStore } from "../../../stores/scanStore";

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
  useScanStore.setState({ root: null, status: "idle" });
});

describe("RequireScan", () => {
  it("renders children when a root has been opened", () => {
    useScanStore.setState({ root: "C:/test", status: "done" });
    renderWithRouter("/explorer");
    expect(screen.getByText("Explorer content")).toBeInTheDocument();
  });

  it("redirects to home when no root has been opened", () => {
    renderWithRouter("/explorer");
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Explorer content")).not.toBeInTheDocument();
  });
});
