import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { expect, vi } from "vitest";
import * as React from "react";

expect.extend(toHaveNoViolations);

if (typeof globalThis.matchMedia === "undefined") {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof matchMedia;
}

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: {} } },
  interpolation: { escapeValue: false },
});

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

vi.mock("react-force-graph-3d", () => {
  const ForceGraph3D = React.forwardRef<
    unknown,
    {
      graphData?: {
        nodes: Array<{ id: string; expanded?: boolean }>;
        links: Array<{ source: string; target: string }>;
      };
      nodeVal?: (node: { id: string }) => number;
      onNodeClick?: (node: { id: string }) => void;
      onNodeHover?: (node: { id: string } | null) => void;
    }
  >(function ForceGraph3D(props, _ref) {
    return React.createElement(
      "div",
      { "data-testid": "force-graph-3d" },
      (props.graphData?.nodes ?? []).map((n) =>
        React.createElement(
          "button",
          {
            key: n.id,
            "data-testid": `graph-node-${n.id}`,
            "data-nodeval": props.nodeVal?.(n),
            "data-expanded": String(n.expanded ?? false),
            onClick: () => props.onNodeClick?.(n),
            onMouseEnter: () => props.onNodeHover?.(n),
            onMouseLeave: () => props.onNodeHover?.(null),
          },
          n.id,
        ),
      ),
    );
  });
  return { default: ForceGraph3D };
});
