import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vitest config — separated from vite.config.ts so Playwright
// (also a `test` runner) doesn't load Vitest's globals when it
// doesn't need them. Tests live next to source under
// `tests/<area>/` to keep the production bundle slim.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/shell/**/*.{ts,tsx}", "src/modules/**/*.{ts,tsx}"],
    },
  },
});
