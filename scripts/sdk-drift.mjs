import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SDK_TYPES_PATH = "node_modules/caprover-api/dist/api/ApiManager.d.ts";
const COVERAGE_PATH = "scripts/sdk-coverage.json";
const API_MANAGER_DECLARATION = "export default class ApiManager";
const METHOD_LINE = /^ {4}(\w+)\(/gm;
const VALID_STATUSES = new Set(["operation", "planned", "excluded", "internal"]);
const STATUSES_WITH_REASON = new Set(["excluded", "internal", "planned"]);

export const readSdkMethods = (typesText) => {
  // Why: the same file declares the authentication classes before ApiManager, and only ApiManager is the SDK surface.
  const apiManagerText = typesText.slice(typesText.indexOf(API_MANAGER_DECLARATION));
  const names = [...apiManagerText.matchAll(METHOD_LINE)].map((match) => match[1]);
  return names.filter((name) => name !== "constructor");
};

const checkEntry = (method, entry) => {
  if (!VALID_STATUSES.has(entry.status)) {
    return [`${method} has the status ${JSON.stringify(entry.status)}; use operation, planned, excluded or internal.`];
  }
  if (STATUSES_WITH_REASON.has(entry.status) && !entry.reason) {
    return [`${method} is ${entry.status} and needs a reason.`];
  }
  if (entry.status === "operation" && !entry.operation) {
    return [`${method} is an operation and needs the name of the operation.`];
  }
  return [];
};

export const findDrift = (sdkMethods, coverage) => {
  const classified = Object.keys(coverage.methods);
  const problems = [];
  for (const method of sdkMethods.filter((name) => !classified.includes(name))) {
    problems.push(`The SDK has the method ${method}, which is not classified in ${COVERAGE_PATH}.`);
  }
  for (const method of classified.filter((name) => !sdkMethods.includes(name))) {
    problems.push(`${COVERAGE_PATH} lists ${method}, which the SDK no longer has.`);
  }
  for (const [method, entry] of Object.entries(coverage.methods)) {
    problems.push(...checkEntry(method, entry));
  }
  return problems;
};

const runDriftCheck = () => {
  const sdkMethods = readSdkMethods(readFileSync(SDK_TYPES_PATH, "utf8"));
  const coverage = JSON.parse(readFileSync(COVERAGE_PATH, "utf8"));
  const problems = findDrift(sdkMethods, coverage);
  if (problems.length > 0) {
    process.stderr.write(`${problems.join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  const planned = Object.values(coverage.methods).filter((entry) => entry.status === "planned").length;
  process.stderr.write(`SDK drift: none. ${sdkMethods.length} methods classified, ${planned} still planned.\n`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDriftCheck();
}
