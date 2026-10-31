import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OPERATIONS_DIR = "src/Operations";
const OPERATION_FILE = /Operation\.ts$/;
const NAME_PATTERN = /static readonly NAME = "(\w+)"/;
const RISK_PATTERN = /readonly risk: RiskTier = "(\w+)"/;
const TIERS = ["read", "write", "destructive", "critical"];
const TOTAL_PATTERN = /\b(\d+) operations\b/g;
const NAME_IN_SECTION = /<code class="tr__name">(\w+)<\/code>/g;
const SUBJECTS = { count: "all operations", read: "read operations", write: "write operations", destructive: "destructive operations", critical: "critical operations" };
const README_ITEM = /^\s*(?:critical:\s*)?`(\w+)`/;

// Why: each text is read only in the places named here (the markers, the number before "operations", the operations table, the tools section), so a name in code format elsewhere never fails the check.
export const SPECS = [
  { path: "README.md", markers: ["count", ...TIERS], names: { reader: "readme-table", complete: true } },
  { path: "AGENTS.md", total: true },
  { path: "site/llms.txt", total: true },
  // Why: the landing page shows the main operations only; the README table is the complete list, so the page may omit an operation but never name one that does not exist.
  { path: "site/index.html", markers: ["count", "critical"], names: { reader: "site-tools", complete: false } },
];

export const buildToolName = (operationName) => operationName.replaceAll(/([A-Z])/g, "_$1").toLowerCase();

export const readOperations = (sources) => {
  return sources.map(({ path, text }) => {
    const name = NAME_PATTERN.exec(text)?.[1];
    const tier = RISK_PATTERN.exec(text)?.[1];
    if (name === undefined || tier === undefined) {
      throw new Error(`${path} has no static NAME or no risk tier to read.`);
    }
    return { name: buildToolName(name), tier };
  });
};

export const countTiers = (operations) => {
  const counts = { count: operations.length };
  for (const tier of TIERS) {
    counts[tier] = operations.filter((operation) => operation.tier === tier).length;
  }
  return counts;
};

const findLine = (text, index) => text.slice(0, index).split("\n").length;

const buildMarkerPattern = (key) => new RegExp(`<!-- operations:${key} -->\\s*(\\d+)\\s*<!-- /operations:${key} -->`, "g");

const checkNumbers = (spec, text, counts) => {
  const problems = [];
  const reads = spec.total === true
    ? [{ label: "a total of operations", pattern: TOTAL_PATTERN, key: "count" }]
    : (spec.markers ?? []).map((key) => ({ label: `the marker operations:${key}`, pattern: buildMarkerPattern(key), key }));
  for (const { label, pattern, key } of reads) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length === 0) {
      problems.push(`${spec.path} has no number to read for ${label}.`);
    }
    for (const match of matches) {
      if (Number(match[1]) !== counts[key]) {
        const subject = SUBJECTS[key];
        problems.push(`${spec.path}:${findLine(text, match.index)} says ${match[1]} for ${subject}, the real number is ${counts[key]}.`);
      }
    }
  }
  return problems;
};

const readSection = (text, startPattern, endPattern) => {
  const start = text.search(startPattern);
  if (start === -1) {
    return null;
  }
  const rest = text.slice(start + 1);
  const end = rest.search(endPattern);
  return { offset: start, text: text.slice(start, end === -1 ? text.length : start + 1 + end) };
};

const readCellNames = (cell, cellStart) => {
  const found = [];
  let cursor = cellStart;
  for (const item of cell.split(/[;,]/)) {
    const name = README_ITEM.exec(item)?.[1];
    if (name !== undefined) {
      found.push({ name, index: cursor });
    }
    cursor += item.length + 1;
  }
  return found;
};

const readReadmeNames = (text) => {
  const section = readSection(text, /^## Operations$/m, /^## /m);
  if (section === null) {
    return null;
  }
  const found = [];
  let cursor = section.offset;
  for (const row of section.text.split("\n")) {
    const cell = row.startsWith("| `") ? row.split("|")[2] ?? "" : "";
    found.push(...readCellNames(cell, cursor + row.indexOf(cell)));
    cursor += row.length + 1;
  }
  return found;
};

const readSiteNames = (text) => {
  const section = readSection(text, /<section id="tools">/, /<\/section>/);
  if (section === null) {
    return null;
  }
  const matches = [...section.text.matchAll(NAME_IN_SECTION)];
  return matches.map((match) => ({ name: match[1], index: section.offset + match.index }));
};

const NAME_READERS = { "readme-table": readReadmeNames, "site-tools": readSiteNames };
const NAME_PLACE = { "readme-table": "operations table", "site-tools": "tools section" };

const checkNames = (spec, text, operations) => {
  const place = NAME_PLACE[spec.names.reader];
  const found = NAME_READERS[spec.names.reader](text);
  if (found === null || found.length === 0) {
    return [`${spec.path} has no ${place} to read.`];
  }
  const real = operations.map((operation) => operation.name);
  const problems = [];
  for (const { name, index } of found.filter((item) => !real.includes(item.name))) {
    problems.push(`${spec.path}:${findLine(text, index)} names ${name} in the ${place}, which is not an operation.`);
  }
  if (spec.names.complete) {
    const named = found.map((item) => item.name);
    for (const name of real.filter((item) => !named.includes(item))) {
      problems.push(`${spec.path} lacks the operation ${name} in the ${place}.`);
    }
  }
  return problems;
};

export const findDocDrift = (operations, texts) => {
  const counts = countTiers(operations);
  const problems = [];
  for (const spec of SPECS) {
    const text = texts[spec.path];
    if (text === undefined) {
      problems.push(`${spec.path} is missing; the check reads it.`);
      continue;
    }
    const numberProblems = checkNumbers(spec, text, counts);
    const nameProblems = spec.names === undefined ? [] : checkNames(spec, text, operations);
    problems.push(...numberProblems, ...nameProblems);
  }
  return problems;
};

const run = () => {
  const sources = readdirSync(OPERATIONS_DIR)
    .filter((file) => OPERATION_FILE.test(file) && !file.endsWith(".test.ts"))
    .map((file) => ({ path: `${OPERATIONS_DIR}/${file}`, text: readFileSync(`${OPERATIONS_DIR}/${file}`, "utf8") }));
  const operations = readOperations(sources);
  const texts = {};
  for (const spec of SPECS) {
    try {
      texts[spec.path] = readFileSync(spec.path, "utf8");
    } catch {
      // Why: a missing file is reported by findDocDrift with its path.
    }
  }
  const problems = findDocDrift(operations, texts);
  if (problems.length > 0) {
    process.stderr.write(`${problems.join("\n")}\n`);
    return 1;
  }
  const counts = countTiers(operations);
  const perTier = TIERS.map((tier) => `${counts[tier]} ${tier}`).join(", ");
  process.stdout.write(`Operation texts agree with the code: ${counts.count} operations (${perTier}).\n`);
  return 0;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(run());
}
