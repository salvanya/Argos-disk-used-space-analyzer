import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
/// <reference types="vitest" />

// Backend port for dev proxy — set VITE_BACKEND_PORT env var when launching.
const backendPort = parseInt(process.env["VITE_BACKEND_PORT"] ?? "8000", 10);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../backend/static",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
      },
      "/ws": {
        target: `ws://127.0.0.1:${backendPort}`,
        ws: true,
      },
    },
  },
});
