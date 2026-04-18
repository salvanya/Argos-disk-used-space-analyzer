import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "monospace"],
      },
      colors: {
        // Design system accents (CLAUDE.md §5.2)
        accent: {
          blue: "#4f8bff",
          violet: "#8b5cf6",
          cyan: "#22d3ee",
        },
        // Semantic tokens — map to CSS variables; support both dark and light mode
        fg: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        canvas: {
          base: "var(--bg-base)",
          surface: "var(--bg-surface)",
          border: "var(--bg-surface-border)",
          hover: "var(--bg-hover)",
          selected: "var(--bg-selected)",
          modal: "var(--bg-modal)",
        },
      },
      borderRadius: {
        DEFAULT: "12px",
        lg: "16px",
        sm: "8px",
      },
      backdropBlur: {
        DEFAULT: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
