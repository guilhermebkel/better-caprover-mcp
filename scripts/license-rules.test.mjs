import { describe, expect, it } from "vitest";
import { findLicenseProblems, listBundledPackages } from "./license-rules.mjs";

describe("listBundledPackages()", () => {
  it("names each package once, scoped packages included", () => {
    const inputs = [
      "node_modules/.pnpm/zod@4.6.7/node_modules/zod/v4/core.js",
      "node_modules/.pnpm/zod@4.6.7/node_modules/zod/index.js",
      "node_modules/.pnpm/@modelcontextprotocol+sdk@1.32.2_zod@4.6.7/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js",
      "src/main.ts",
    ];

    expect(listBundledPackages(inputs)).toStrictEqual(["@modelcontextprotocol/sdk", "zod"]);
  });

  it("returns nothing for the code of the project itself", () => {
    expect(listBundledPackages(["src/main.ts", "src/Utils/EnvUtil.ts"])).toStrictEqual([]);
  });
});

describe("findLicenseProblems()", () => {
  it("accepts the licenses on the list", () => {
    expect(findLicenseProblems({ "zod": "MIT", "caprover-api": "ISC" })).toStrictEqual([]);
  });

  it("names the package whose license is not allowed", () => {
    expect(findLicenseProblems({ zod: "MIT", copyleft: "GPL-3.0-only" })).toStrictEqual([
      "copyleft has the license GPL-3.0-only, which is not allowed in the bundle.",
    ]);
  });
});
