import { describe, expect, it } from "vitest";
import { findManifestWarnings, findPackProblems, MAX_PACK_BYTES } from "./pack-rules.mjs";

const GOOD_PATHS = ["dist/main.js", "package.json", "LICENSE", "README.md"];

describe("findPackProblems()", () => {
  it("accepts the files of a normal package", () => {
    expect(findPackProblems(GOOD_PATHS, 1000)).toStrictEqual([]);
  });

  it("names a file that should not ship", () => {
    expect(findPackProblems([...GOOD_PATHS, "src/main.ts"], 1000)).toStrictEqual([
      "Unexpected file in the package: src/main.ts",
    ]);
  });

  it("names a file the package must have", () => {
    expect(findPackProblems(["dist/main.js", "package.json", "README.md"], 1000)).toStrictEqual([
      "The package lacks LICENSE.",
    ]);
  });

  it("refuses a package above the size limit", () => {
    expect(findPackProblems(GOOD_PATHS, MAX_PACK_BYTES + 1)).toStrictEqual([
      `The package is ${MAX_PACK_BYTES + 1} bytes; the limit is ${MAX_PACK_BYTES}.`,
    ]);
  });
});

describe("findManifestWarnings()", () => {
  it("asks for npm pkg fix when npm corrected the manifest", () => {
    expect(findManifestWarnings("npm warn publish auto-corrected some errors")).toStrictEqual([
      "npm auto-corrected package.json; run `npm pkg fix` and commit the result.",
    ]);
  });

  it("is silent when npm said nothing", () => {
    expect(findManifestWarnings("")).toStrictEqual([]);
  });
});
