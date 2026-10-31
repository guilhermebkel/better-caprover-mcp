import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countTiers, findDocDrift, readOperations, buildToolName } from "./check-operation-docs.mjs";

const OPERATIONS = [
  { name: "list_apps", tier: "read" },
  { name: "get_app", tier: "read" },
  { name: "set_env_vars", tier: "write" },
  { name: "delete_app", tier: "destructive" },
  { name: "set_password", tier: "critical" },
];

const SWAPPED_TIERS = { get_app: "critical" };

const buildMarker = (key, number) => `<!-- operations:${key} -->${number}<!-- /operations:${key} -->`;

const buildReadme = ({ count = 5, names = ["`list_apps`, `get_app`", "`set_env_vars`", "`delete_app`", "critical: `set_password`"] } = {}) => [
  "# Title",
  "## Operations",
  `The server exposes ${buildMarker("count", count)} operations in ten toolsets.`,
  "| Toolset | Operations |",
  "| --- | --- |",
  ...names.map((cell, index) => `| \`toolset${index}\` | ${cell} (only \`isSet\`; a note) |`),
  "## Configuration",
  "Not an operation: `get_overview`.",
].join("\n");

const buildSite = ({ count = 5, critical = 1, names = ["list_apps", "delete_app"] } = {}) => [
  `<p>${buildMarker("count", count)} operations, ${buildMarker("critical", critical)} critical</p>`,
  "<section id=\"tools\">",
  ...names.map((name) => `<li><code class="tr__name">${name}</code></li>`),
  "</section>",
  "<code>get_overview</code>",
].join("\n");

const buildTexts = (overrides = {}) => ({
  "README.md": buildReadme(),
  "AGENTS.md": "Today the server exposes 5 operations on the surface.",
  "site/llms.txt": "5 operations, no raw-request tool.",
  "site/index.html": buildSite(),
  ...overrides,
});

describe("buildToolName()", () => {
  it("writes the camelCase name the way a client sees the tool", () => {
    expect(buildToolName("getOneClickDeployProgress")).toBe("get_one_click_deploy_progress");
  });
});

describe("readOperations() and countTiers()", () => {
  it("reads the name and the tier of each class", () => {
    const text = "static readonly NAME = \"setEnvVars\";\n  readonly risk: RiskTier = \"write\";";

    expect(readOperations([{ path: "SetEnvVarsOperation.ts", text }])).toStrictEqual([{ name: "set_env_vars", tier: "write" }]);
  });

  it("fails and names the file when there is no NAME or tier", () => {
    expect(() => readOperations([{ path: "BrokenOperation.ts", text: "class X {}" }])).toThrow("BrokenOperation.ts has no static NAME or no risk tier to read.");
  });

  it("counts the total and each tier", () => {
    expect(countTiers(OPERATIONS)).toStrictEqual({ count: 5, read: 2, write: 1, destructive: 1, critical: 1 });
  });
});

describe("findDocDrift()", () => {
  it("passes when every text agrees with the code (AC1)", () => {
    const problems = findDocDrift(OPERATIONS, buildTexts());
    expect(problems).toStrictEqual([]);
  });

  it("names the file, the line, the number found and the real number for a wrong total (AC4)", () => {
    const texts = buildTexts({ "AGENTS.md": "line one\nToday the server exposes 4 operations." });

    const problems = findDocDrift(OPERATIONS, texts);
    expect(problems).toStrictEqual(["AGENTS.md:2 says 4 for all operations, the real number is 5."]);
  });

  it("fails on a wrong total in a marker of the site", () => {
    const problems = findDocDrift(OPERATIONS, buildTexts({ "site/index.html": buildSite({ count: 7 }) }));

    expect(problems).toStrictEqual(["site/index.html:1 says 7 for all operations, the real number is 5."]);
  });

  it("fails on a wrong total in the marker of the README", () => {
    const problems = findDocDrift(OPERATIONS, buildTexts({ "README.md": buildReadme({ count: 6 }) }));

    expect(problems).toStrictEqual(["README.md:3 says 6 for all operations, the real number is 5."]);
  });

  it("names the text when the count of a tier differs (AC5)", () => {
    const problems = findDocDrift(OPERATIONS, buildTexts({ "site/index.html": buildSite({ critical: 4 }) }));

    expect(problems).toStrictEqual(["site/index.html:1 says 4 for critical operations, the real number is 1."]);
  });

  it("fails when a tier is swapped in the code but the text keeps the old count", () => {
    const swapped = OPERATIONS.map((operation) => {
      return { ...operation, tier: SWAPPED_TIERS[operation.name] ?? operation.tier };
    });

    const problems = findDocDrift(swapped, buildTexts());
    expect(problems).toStrictEqual(["site/index.html:1 says 1 for critical operations, the real number is 2."]);
  });

  it("fails on every text that keeps the old numbers when an operation is added without a text change (AC2)", () => {
    const operations = [...OPERATIONS, { name: "get_guide", tier: "read" }];

    const problems = findDocDrift(operations, buildTexts());
    expect(problems).toStrictEqual([
      "README.md:3 says 5 for all operations, the real number is 6.",
      "README.md lacks the operation get_guide in the operations table.",
      "AGENTS.md:1 says 5 for all operations, the real number is 6.",
      "site/llms.txt:1 says 5 for all operations, the real number is 6.",
      "site/index.html:1 says 5 for all operations, the real number is 6.",
    ]);
  });

  it("names the file and the line of an operation that was removed (AC3)", () => {
    const removed = OPERATIONS.filter((operation) => operation.name !== "delete_app");
    const texts = buildTexts({
      "README.md": buildReadme({ count: 4 }),
      "AGENTS.md": "4 operations.",
      "site/llms.txt": "4 operations.",
      "site/index.html": buildSite({ count: 4 }),
    });

    const problems = findDocDrift(removed, texts);
    expect(problems).toStrictEqual([
      "README.md:8 names delete_app in the operations table, which is not an operation.",
      "site/index.html:4 names delete_app in the tools section, which is not an operation.",
    ]);
  });

  it("lets the site omit an operation that exists", () => {
    const problems = findDocDrift(OPERATIONS, buildTexts({ "site/index.html": buildSite({ names: ["list_apps"] }) }));
    expect(problems).toStrictEqual([]);
  });

  it("fails and names the file and the marker when a text has none to read (AC6)", () => {
    const texts = buildTexts({ "AGENTS.md": "No number here.", "site/index.html": "<section id=\"tools\"><code class=\"tr__name\">list_apps</code></section>" });

    const problems = findDocDrift(OPERATIONS, texts);
    expect(problems).toStrictEqual([
      "AGENTS.md has no number to read for a total of operations.",
      "site/index.html has no number to read for the marker operations:count.",
      "site/index.html has no number to read for the marker operations:critical.",
    ]);
  });

  it("fails when a text is missing or has no operations table or tools section (AC6)", () => {
    const texts = buildTexts({ "site/llms.txt": undefined, "README.md": buildMarker("count", 5), "site/index.html": `${buildMarker("count", 5)} ${buildMarker("critical", 1)}` });

    const problems = findDocDrift(OPERATIONS, texts);
    expect(problems).toStrictEqual([
      "README.md has no operations table to read.",
      "site/llms.txt is missing; the check reads it.",
      "site/index.html has no tools section to read.",
    ]);
  });

  it("does not read an operation name outside the table and the tools section (AC7)", () => {
    const texts = buildTexts({ "README.md": `${buildReadme()}\n- changelog: renamed \`removed_tool\`` });

    const problems = findDocDrift(OPERATIONS, texts);
    expect(problems).toStrictEqual([]);
  });
});

describe("the real repository", () => {
  it("has texts that agree with the operations in src/Operations", () => {
    const sources = readdirSync("src/Operations")
      .filter((file) => file.endsWith("Operation.ts"))
      .map((file) => ({ path: file, text: readFileSync(`src/Operations/${file}`, "utf8") }));
    const texts = {};
    for (const path of ["README.md", "AGENTS.md", "site/llms.txt", "site/index.html"]) {
      texts[path] = readFileSync(path, "utf8");
    }

    const problems = findDocDrift(readOperations(sources), texts);
    expect(problems).toStrictEqual([]);
  });
});
