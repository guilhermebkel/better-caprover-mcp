import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config.mjs";

const SETUP_TIMEOUT_MS = 120_000;

// Why: these tests need a real CapRover, so `pnpm test` leaves them out and `pnpm test:integration` runs only them.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ["scripts/**/*.integration.test.mjs"],
    exclude: ["**/node_modules/**", "dist/**"],
    testTimeout: SETUP_TIMEOUT_MS,
    hookTimeout: SETUP_TIMEOUT_MS,
    fileParallelism: false,
  },
});
