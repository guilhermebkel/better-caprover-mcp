import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const TIMEOUT_MS = 30_000;

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

// Why: same alias as `paths` in tsconfig.json; esbuild reads that one when bundling.
const alias = {
  "@": fileURLToPath(new URL("src", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  // Why: tsup injects the same constant at build time, so the tests read the version the bundle will carry.
  define: { __PACKAGE_VERSION__: JSON.stringify(packageJson.version) },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs", "*.test.mjs"],
    exclude: ["**/node_modules/**", "dist/**", "lint-fixtures-*/**", "**/*.integration.test.*"],
    environment: "node",
    // Why: stubbed globals and env stubs are undone after every test so nothing leaks into the next file.
    unstubGlobals: true,
    unstubEnvs: true,
    testTimeout: TIMEOUT_MS,
    hookTimeout: TIMEOUT_MS,
  },
});
