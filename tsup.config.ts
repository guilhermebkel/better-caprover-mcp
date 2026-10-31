import { defineConfig } from "tsup";
import packageJson from "./package.json" with { type: "json" };

// Why: one bundled file keeps `npx` fast (nothing else to install) and lets the Docker image copy a single file.
export default defineConfig({
  entry: { main: "src/main.ts" },
  format: ["esm"],
  platform: "node",
  target: "node22",
  clean: true,
  splitting: false,
  sourcemap: false,
  noExternal: [/.*/],
  // Why: node-fetch needs "punycode"; the built-in one prints a deprecation warning on every start, so the bundle uses the package.
  esbuildOptions(options) {
    options.alias = { punycode: "punycode/" };
  },
  banner: {
    // Why: the SDK pulls in CommonJS code (node-fetch) that calls require() on Node built-ins, and the sandbox engine reads __dirname, which an ES module bundle lacks.
    js: "#!/usr/bin/env node\nimport { createRequire as createRequireForBundle } from \"node:module\";\nimport { dirname as dirnameForBundle } from \"node:path\";\nimport { fileURLToPath as fileURLToPathForBundle } from \"node:url\";\nconst require = createRequireForBundle(import.meta.url);\nconst __filename = fileURLToPathForBundle(import.meta.url);\nconst __dirname = dirnameForBundle(__filename);",
  },
  define: { __PACKAGE_VERSION__: JSON.stringify(packageJson.version) },
});
