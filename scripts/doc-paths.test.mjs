import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const PATH_PATTERN = /\b((?:src|scripts|docs|design|site)\/[\w./-]+)/gu;
const WILDCARD = /[*<>{}]/u;
const TRAILING_PUNCTUATION = /[.,;:)]$/u;
// Why: the sandbox adapter is planned work (the `code` surface); its folder is named in the rules before it exists.
const PLANNED_PATHS = new Set(["src/Adapters/Sandbox/"]);
const ROOT_FILES = ["AGENTS.md", "README.md", "GLOSSARY.md", "knip.json", ".jscpd.json", "tsup.config.ts", ".oxlintrc.json"];

const listMarkdown = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
  const relative = `${dir}/${entry.name}`;
  if (entry.isDirectory()) {
    return listMarkdown(relative);
  }
  return relative.endsWith(".md") ? [relative] : [];
});

const readCheckedFiles = () => [
  ...ROOT_FILES,
  // Why: an ADR keeps the paths of its day and says it was moved, so only the living docs and the configs are checked.
  ...listMarkdown("docs").filter((path) => !path.startsWith("docs/adr/")),
  ...readdirSync(join(ROOT, "scripts")).filter((name) => name.endsWith(".mjs") && !name.endsWith(".test.mjs")).map((name) => `scripts/${name}`),
];

const findMissingPaths = (file) => {
  const text = readFileSync(join(ROOT, file), "utf8");
  const paths = [...text.matchAll(PATH_PATTERN)].map((match) => match[1].replace(TRAILING_PUNCTUATION, ""));
  return paths.filter((path) => !WILDCARD.test(path) && !PLANNED_PATHS.has(path) && !existsSync(join(ROOT, path))).map((path) => `${file}: ${path}`);
};

describe("paths named in the docs, the configs and the scripts", () => {
  it("all exist in the repository", () => {
    const missing = readCheckedFiles().flatMap(findMissingPaths);
    expect(missing).toStrictEqual([]);
  });
});
