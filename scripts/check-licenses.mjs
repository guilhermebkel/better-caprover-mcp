import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { findLicenseProblems, listBundledPackages } from "./license-rules.mjs";

const KILOBYTE = 1024;
const MAX_OUTPUT_KILOBYTES = 65_536;

const result = await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  write: false,
  metafile: true,
  platform: "node",
  format: "esm",
  logLevel: "silent",
  alias: { "@": "./src", "punycode": "punycode/" },
  define: { __PACKAGE_VERSION__: "\"0.0.0\"" },
});
const bundled = listBundledPackages(Object.keys(result.metafile.inputs));
const output = execFileSync("pnpm", ["licenses", "list", "--json"], { encoding: "utf8", maxBuffer: MAX_OUTPUT_KILOBYTES * KILOBYTE });
const licenseToPackages = JSON.parse(output);
const packageToLicense = {};
for (const [license, packages] of Object.entries(licenseToPackages)) {
  for (const entry of packages.filter((candidate) => bundled.includes(candidate.name))) {
    packageToLicense[entry.name] = license;
  }
}
const unknown = bundled.filter((name) => packageToLicense[name] === undefined);
const problems = [...findLicenseProblems(packageToLicense), ...unknown.map((name) => `${name} is bundled and has no license entry.`)];
if (problems.length > 0) {
  process.stderr.write(`${problems.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`licenses ok: ${bundled.length} bundled packages, ${[...new Set(Object.values(packageToLicense))].join(", ")}\n`);
}
