import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "../Footer";

describe("Footer", () => {
  it("renders the Argos brand literal", () => {
    render(<Footer />);
    expect(screen.getByText(/Argos/)).toBeInTheDocument();
  });

  it("renders the author name verbatim (not translated)", () => {
    render(<Footer />);
    expect(screen.getByText(/Leandro Salvañá/)).toBeInTheDocument();
  });

  it("renders the MIT License literal", () => {
    render(<Footer />);
    expect(screen.getByText(/MIT License/)).toBeInTheDocument();
  });

  it("renders the translated createdBy key slot", () => {
    // test-setup initialises i18next with empty resources, so t() returns the
    // key verbatim. Asserting the key's presence proves the component asks for
    // a translation instead of hard-coding "created by".
    render(<Footer />);
    expect(screen.getByText(/footer\.createdBy/)).toBeInTheDocument();
  });

  it("renders as a <footer> landmark", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
