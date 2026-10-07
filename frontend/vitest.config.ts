import { defineConfig } from "vitest/config";

// Unit tests cover the pure logic in src/lib (no browser needed): run with `npm test`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
