import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { afterAll, describe, it } from "vitest";
import { localRules } from "./eslint-local-rules.mjs";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const PROTOCOL_FILE = "src/Protocols/ChatProtocol.ts";
const SERVICE_FILE = "src/Services/ChatService.ts";
const TIME_UTIL_FILE = "src/Utils/TimeUtil.ts";
const UNTYPED_MAP_CODE = "const KIND_TO_SIZE = { a: 1, b: 2 };";
const LIST_APPS_FILE = "src/Operations/ListAppsOperation.ts";

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: "module" } });

ruleTester.run("literal-dispatch", localRules.rules["literal-dispatch"], {
  valid: [
    {
      name: "one comparison that leaves early is a guard",
      code: "function f(threshold) { if (threshold === \"always\") { return true; } return false; }",
    },
    {
      name: "the same subject in different functions",
      code: "function f(kind) { if (kind === \"a\") { return 1; } } function g(kind) { return kind === \"b\"; }",
    },
    {
      name: "comparisons with values that aren't fixed",
      code: "function f(kind, other) { if (kind === other) { return 1; } if (kind === other.kind) { return 2; } }",
    },
    {
      name: "a comparison stored once and reused",
      code: "function f(mode) { const isText = mode === \"text\"; if (isText) { return 1; } return isText ? 2 : 3; }",
    },
    {
      name: "a comparison that only becomes a value, in a callback or an argument",
      code: "function f(calls) { return calls.filter((call) => call.category === \"edit\"); }",
    },
    {
      name: "a guard that throws or continues",
      code: "function f(items) { for (const item of items) { if (item.kind === \"skip\") continue; } if (items.mode === \"x\") { throw new Error(); } }",
    },
    {
      name: "type checks and emptiness checks",
      code: "function f(value) { return typeof value === \"string\" && value !== \"\" ? value : undefined; }",
    },
    {
      name: "a lookup in a map",
      code: "const KIND_TO_HANDLER = { a: () => 1, b: () => 2 }; function f(kind) { return KIND_TO_HANDLER[kind](); }",
    },
  ],
  invalid: [
    {
      name: "if statements one after another",
      code: "function f(lineType) { if (lineType === \"user\") { return 1; } if (lineType === \"assistant\") { return 2; } }",
      errors: [{ messageId: "repeated", data: { subject: "lineType" } }],
    },
    {
      name: "an else-if chain",
      code: "function f(kind) { if (kind === \"a\") { return 1; } else if (kind === \"b\") { return 2; } else { return 3; } }",
      errors: [{ messageId: "branch" }, { messageId: "repeated" }],
    },
    {
      name: "a ternary after an if, through optional chaining",
      code: "function f(match) { if (match?.kind === \"none\") { return []; } return match.kind === \"language\" ? [1] : [2]; }",
      errors: [{ messageId: "repeated", data: { subject: "match.kind" } }],
    },
    {
      name: "comparisons joined by || or &&",
      code: "function f(result) { return result.kind !== \"interrupted\" && result.kind !== \"user_rejected\"; }"
        + " function g(result) { if (result.kind === \"interrupted\" || result.kind === \"user_rejected\") { return 1; } }",
      errors: [{ messageId: "repeated" }, { messageId: "repeated" }],
    },
    {
      name: "a single if that does work instead of leaving",
      code: "function f(options) { let fingerprint; if (options.status === \"applied\") { fingerprint = 1; } return fingerprint; }",
      errors: [{ messageId: "branch", data: { subject: "options.status" } }],
    },
    {
      name: "a single ternary, also inside && or ||",
      code: "function f(metadata, isOn) { return isOn && metadata?.trigger === \"manual\" ? \"manual\" : \"auto\"; }",
      errors: [{ messageId: "branch", data: { subject: "metadata.trigger" } }],
    },
    {
      name: "a switch over fixed values",
      code: "function f(kind) { switch (kind) { case \"a\": return 1; case \"b\": return 2; default: return 3; } }",
      errors: [{ messageId: "switchCases" }],
    },
  ],
});

ruleTester.run("comment-marker", localRules.rules["comment-marker"], {
  valid: [
    {
      name: "a comment that names the hidden rule, over two lines",
      code: "// Why: the provider repeats usage on every line.\n// Count it once per message.\nconst usage = 1;",
    },
    {
      name: "a legacy marker for code that keeps old data working",
      code: "// @legacy: rows saved before the rename keep the old key.\nconst key = 1;",
    },
    {
      name: "tool directives",
      code: "// eslint-disable-next-line no-console\nconsole.log(1);\n/* global window */",
    },
  ],
  invalid: [
    {
      name: "a comment that narrates the code",
      code: "// Add one to the total.\nconst total = 1;",
      errors: [{ messageId: "missing" }],
    },
    {
      name: "a doc block that repeats the name",
      code: "/** Parses the line. */\nfunction parseLine() {}",
      errors: [{ messageId: "missing" }],
    },
  ],
});

ruleTester.run("class-matches-file", localRules.rules["class-matches-file"], {
  valid: [
    {
      name: "one exported class named after its file",
      filename: TIME_UTIL_FILE,
      code: "export class TimeUtil {}",
    },
    {
      name: "a class expression inside a function is not the file's class",
      filename: TIME_UTIL_FILE,
      code: "export class TimeUtil { static make() { return class {}; } }",
    },
  ],
  invalid: [
    {
      name: "a second class in the file",
      filename: "src/Adapters/ClaudeCode/Services/ClaudeCodeInventoryService.ts",
      code: "class InventoryBuilder {} export class ClaudeCodeInventoryService {}",
      errors: [{ messageId: "mismatch", data: { name: "InventoryBuilder", file: "ClaudeCodeInventoryService" } }],
    },
    {
      name: "a file named after something else",
      filename: "src/Utils/SessionFactsFixtureUtil.ts",
      code: "export class SessionFactsBuilder {}",
      errors: [{ messageId: "mismatch", data: { name: "SessionFactsBuilder", file: "SessionFactsFixtureUtil" } }],
    },
  ],
});

const FIXTURE_PREFIX = join(tmpdir(), "describe-target-");
const FIXTURE_ROOT = mkdtempSync(FIXTURE_PREFIX);
mkdirSync(join(FIXTURE_ROOT, "src/Utils"), { recursive: true });
mkdirSync(join(FIXTURE_ROOT, "src/Adapters/ClaudeCode"), { recursive: true });
const TIME_UTIL_SOURCE = join(FIXTURE_ROOT, "src/Utils/TimeUtil.ts");
writeFileSync(TIME_UTIL_SOURCE, "export class TimeUtil { static parsePointInTime() {} }");
const ADAPTER_SOURCE = join(FIXTURE_ROOT, "src/Adapters/ClaudeCode/ClaudeCodeProviderAdapter.ts");
writeFileSync(ADAPTER_SOURCE, "export class ClaudeCodeProviderAdapter { parseSession() {} private sessionService() {} }");
const TIME_UTIL_TEST = join(FIXTURE_ROOT, "src/Utils/TimeUtil.test.ts");
const ADAPTER_TEST = join(FIXTURE_ROOT, "src/Adapters/ClaudeCode/ClaudeCodeProviderAdapter.test.ts");

ruleTester.run("describe-target", localRules.rules["describe-target"], {
  valid: [
    {
      name: "the outer describe names the class and a public static method, with contexts inside",
      filename: TIME_UTIL_TEST,
      code: "describe(\"TimeUtil.parsePointInTime()\", () => { describe(\"on a period\", () => { it(\"reads days\", () => {}); }); });",
    },
    {
      name: "a public instance method, next to hooks at the top level",
      filename: ADAPTER_TEST,
      code: "beforeEach(() => {}); describe(\"ClaudeCodeProviderAdapter.parseSession()\", () => {});",
    },
  ],
  invalid: [
    {
      name: "a method without the class",
      filename: TIME_UTIL_TEST,
      code: "describe(\"parsePointInTime\", () => {});",
      errors: [{ messageId: "format", data: { className: "TimeUtil" } }],
    },
    {
      name: "a theme instead of a method",
      filename: TIME_UTIL_TEST,
      code: "describe(\"TimeUtil\", () => {});",
      errors: [{ messageId: "format", data: { className: "TimeUtil" } }],
    },
    {
      name: "another class than the file's",
      filename: TIME_UTIL_TEST,
      code: "describe(\"RedactUtil.redact()\", () => {});",
      errors: [{ messageId: "otherClass", data: { className: "TimeUtil", named: "RedactUtil" } }],
    },
    {
      name: "a private method",
      filename: ADAPTER_TEST,
      code: "describe(\"ClaudeCodeProviderAdapter.sessionService()\", () => {});",
      errors: [{
        messageId: "notPublic",
        data: { className: "ClaudeCodeProviderAdapter", method: "sessionService", source: "ClaudeCodeProviderAdapter.ts" },
      }],
    },
    {
      name: "a method the class doesn't have, as after a rename",
      filename: TIME_UTIL_TEST,
      code: "describe(\"TimeUtil.parseDate()\", () => {});",
      errors: [{ messageId: "notPublic", data: { className: "TimeUtil", method: "parseDate", source: "TimeUtil.ts" } }],
    },
    {
      name: "a test outside any describe",
      filename: TIME_UTIL_TEST,
      code: "it(\"reads days\", () => {});",
      errors: [{ messageId: "outside", data: { className: "TimeUtil" } }],
    },
  ],
});

const tsRuleTester = new RuleTester({ languageOptions: { parser: tseslint.parser, ecmaVersion: 2024, sourceType: "module" } });

tsRuleTester.run("comment-placement", localRules.rules["comment-placement"], {
  valid: [
    {
      name: "a comment next to the line whose rule it explains",
      filename: TIME_UTIL_FILE,
      code: "export class TimeUtil {\n  static parse(value: string) {\n    // Why: \"3m\" means months.\n    return value;\n  }\n}",
    },
    {
      name: "a comment on a constant",
      filename: "src/Utils/GitUtil.ts",
      code: "import { x } from \"y\";\n// Why: porcelain prints a status and a space first.\nconst OFFSET = 3;",
    },
    {
      name: "tool directives anywhere, even in a type file",
      filename: "src/Protocols/SessionProtocol.ts",
      code: "// eslint-disable-next-line no-var\nexport interface ThreadRef { id: string }",
    },
  ],
  invalid: [
    {
      name: "a file header",
      filename: "src/Modules/CLIModule.ts",
      code: "// Why: the only module that writes to stdout.\n\nimport { x } from \"y\";",
      errors: [{ messageId: "header" }],
    },
    {
      name: "any comment in a type file",
      filename: "src/Protocols/ConfigProtocol.ts",
      code: "export interface ModelPrice {\n  // Why: USD per million tokens.\n  input: number;\n}",
      errors: [{ messageId: "protocol" }],
    },
    {
      name: "a comment above a method, once for consecutive lines",
      filename: "src/Services/StoreService.ts",
      code: "export class StoreService {\n  // Why: writes atomically,\n  // so a crash never leaves half a file.\n  async writeJson() {}\n}",
      errors: [{ messageId: "declaration", line: 2 }],
    },
    {
      name: "a comment above an exported class or a function constant",
      filename: "src/Services/GapService.ts",
      code: "import { x } from \"y\";\n// Why: what the script couldn't map.\nexport class GapService {}\n// Why: numeric order.\nconst compare = () => 0;",
      errors: [{ messageId: "declaration", line: 2 }, { messageId: "declaration", line: 4 }],
    },
  ],
});

tsRuleTester.run("map-name", localRules.rules["map-name"], {
  valid: [
    { name: "a property named after key and value", code: "interface R { suggestionIdToCost: Record<string, number> }" },
    { name: "a constant map", code: "const STATUS_TO_RECORD: Record<string, () => void> = {};" },
    { name: "a new Map named after key and value", code: "const pathToDate = new Map<string, number>();" },
    { name: "a record of unknown values is a plain object", code: "type UnknownRecord = Record<string, unknown>;" },
    { name: "a list is not a map", code: "interface R { costs: number[] }" },
  ],
  invalid: [
    {
      name: "a Record property",
      code: "interface R { costs: Record<string, number> }",
      errors: [{ messageId: "unnamed" }],
    },
    {
      name: "a type alias of a Record",
      code: "type PriceTable = Record<string, number>;",
      errors: [{ messageId: "unnamed" }],
    },
    {
      name: "a Map inside Partial, and a Map parameter",
      code: "interface R { counters: Partial<Record<string, number>> }\nfunction f(seen: Map<string, number>) {}",
      errors: [{ messageId: "unnamed" }, { messageId: "unnamed" }],
    },
    {
      name: "a new Map without a type",
      code: "const seen = new Map();",
      errors: [{ messageId: "unnamed" }],
    },
  ],
});

tsRuleTester.run("known-keys", localRules.rules["known-keys"], {
  valid: [
    { name: "a record keyed by a union", code: "const LEVEL_TO_RANK: Record<Level, number> = { low: 1, high: 2 };" },
    { name: "a list typed with a union", code: "const LEVELS: readonly Level[] = [\"low\", \"high\"];" },
    { name: "a set typed with a union", code: "const OPEN: ReadonlySet<Status> = new Set([\"submitted\", \"streaming\"]);" },
    { name: "a record whose keys are computed", code: "const KEY_TO_VALUE: Record<string, number> = { [first]: 1, [second]: 2 };" },
    { name: "a list that is not all literals", code: "const NAMES: string[] = [first, \"b\"];" },
    { name: "a set built from a variable", code: "const SEEN: ReadonlySet<string> = new Set(names);" },
    { name: "a map keyed by a union", code: "const NAME_TO_TEXT = new Map<SkillName, string>([[\"analyze-case\", \"x\"]]);" },
    { name: "a map built from computed keys", code: "const IDS = new Map<string, number>(items.map((item) => [item.id, 1]));" },
    { name: "a map keyed by free text, filled later", code: "const doiToRanked = new Map<string, Ranked>();" },
    { name: "a map keyed by free text entries", code: "const doiToRanked = new Map<string, Ranked>([[first.doi, first]]);" },
  ],
  invalid: [
    {
      name: "a record keyed by string with all keys known",
      code: "class A { static readonly CODE_TO_TEXT: Record<string, string> = { a: \"x\", b: \"y\" }; }",
      errors: [{ messageId: "keys" }],
    },
    {
      name: "a list of string with all values known",
      code: "const LEVELS: string[] = [\"low\", \"high\"];",
      errors: [{ messageId: "values" }],
    },
    {
      name: "a readonly list of string",
      code: "const LEVELS: readonly string[] = [\"low\", \"high\"];",
      errors: [{ messageId: "values" }],
    },
    {
      name: "a set of string with all values known",
      code: "const KEYS: ReadonlySet<string> = new Set([\"Escape\"]);",
      errors: [{ messageId: "values" }],
    },
    {
      name: "a new Map keyed by string with fixed keys",
      code: "const NAME_TO_TEXT = new Map<string, string>([[\"analyze-case\", \"x\"]]);",
      errors: [{ messageId: "keys" }],
    },
    {
      name: "an annotated Map built from fixed keys",
      code: "const NAME_TO_TEXT: ReadonlyMap<string, string> = new Map([[\"a\", \"x\"], [\"b\", \"y\"]]);",
      errors: [{ messageId: "keys" }],
    },
  ],
});

tsRuleTester.run("no-bare-string-field", localRules.rules["no-bare-string-field"], {
  valid: [
    { name: "a property typed with a union", code: "type A = { state: \"running\" | \"done\" };" },
    { name: "a property typed with a declared type", code: "type A = { state: StepState; role?: Role };" },
    { name: "a property typed with a template literal", code: "type A = { type: `tool-${string}` };" },
    { name: "a free text property with another name", code: "type A = { title: string; label: string };" },
    { name: "a type literal with a declared type", code: "type A = { kind: Kind; mode?: Mode | null };" },
  ],
  invalid: [
    { name: "state typed string", code: "type A = { state: string };", errors: [{ messageId: "bare", data: { name: "state" } }] },
    { name: "an optional type", code: "type A = { type?: string };", errors: [{ messageId: "bare", data: { name: "type" } }] },
    { name: "string or undefined", code: "type A = { role: string | undefined };", errors: [{ messageId: "bare", data: { name: "role" } }] },
    {
      name: "kind, status, mode and phase",
      code: "type A = { kind: string; status: string | null; mode: string; phase: string };",
      errors: [{ messageId: "bare" }, { messageId: "bare" }, { messageId: "bare" }, { messageId: "bare" }],
    },
  ],
});

ruleTester.run("error-location", localRules.rules["error-location"], {
  valid: [
    {
      name: "an error class in src/Errors named after what went wrong",
      code: "export class DailyLimitError extends Error {}",
      filename: "src/Errors/DailyLimitError.ts",
    },
    {
      name: "a class that is not an error, anywhere",
      code: "export class ChatService extends Base {}",
      filename: SERVICE_FILE,
    },
    {
      name: "an error that extends another project error, in src/Errors",
      code: "export class NotFoundError extends HttpError {}",
      filename: "/repo/src/Errors/NotFoundError.ts",
    },
  ],
  invalid: [
    {
      name: "an error class outside src/Errors",
      code: "export class ChatAccessError extends Error {}",
      filename: "src/Services/ChatAccessError.ts",
      errors: [{ messageId: "folder" }],
    },
    {
      name: "an error class in src/Errors without the Error suffix",
      code: "export class DailyLimit extends Error {}",
      filename: "src/Errors/DailyLimit.ts",
      errors: [{ messageId: "suffix" }],
    },
  ],
});

tsRuleTester.run("operation-name", localRules.rules["operation-name"], {
  valid: [
    {
      name: "an operation whose NAME is its class name without Operation, in camelCase",
      filename: LIST_APPS_FILE,
      code: "export class ListAppsOperation { static readonly NAME = \"listApps\"; }",
    },
    {
      name: "a class in src/Operations that is not an operation",
      filename: "src/Operations/OperationCatalog.ts",
      code: "export class OperationCatalog { static readonly LIST = []; }",
    },
    {
      name: "an operation-named class outside src/Operations is not checked",
      filename: "src/Services/ListAppsOperation.ts",
      code: "export class ListAppsOperation { static readonly NAME = \"other\"; }",
    },
  ],
  invalid: [
    {
      name: "an operation whose NAME keeps an old name",
      filename: LIST_APPS_FILE,
      code: "export class ListAppsOperation { static readonly NAME = \"getApps\"; }",
      errors: [{ messageId: "mismatch" }],
    },
    {
      name: "an operation whose NAME is the class name in PascalCase",
      filename: "src/Operations/GetOverviewOperation.ts",
      code: "export class GetOverviewOperation { static readonly NAME = \"GetOverview\"; }",
      errors: [{ messageId: "mismatch" }],
    },
    {
      name: "an operation without a NAME",
      filename: "src/Operations/DeleteAppOperation.ts",
      code: "export class DeleteAppOperation { build() { return {}; } }",
      errors: [{ messageId: "missing" }],
    },
  ],
});

tsRuleTester.run("operation-port", localRules.rules["operation-port"], {
  valid: [
    {
      name: "an operation that implements OperationPort",
      filename: LIST_APPS_FILE,
      code: "export class ListAppsOperation implements OperationPort<ListAppsInput> { static readonly NAME = \"listApps\"; }",
    },
    {
      name: "a class in src/Operations that is not an operation",
      filename: "src/Operations/OperationCatalog.ts",
      code: "export class OperationCatalog { static readonly LIST = []; }",
    },
    {
      name: "an operation-named class outside src/Operations is not checked",
      filename: "src/Services/ListAppsOperation.ts",
      code: "export class ListAppsOperation { }",
    },
  ],
  invalid: [
    {
      name: "an operation that implements nothing",
      filename: "src/Operations/DeleteAppOperation.ts",
      code: "export class DeleteAppOperation { execute() { return {}; } }",
      errors: [{ messageId: "missing" }],
    },
    {
      name: "an operation that implements another interface",
      filename: "src/Operations/GetOverviewOperation.ts",
      code: "export class GetOverviewOperation implements ChatPort { }",
      errors: [{ messageId: "missing" }],
    },
  ],
});

ruleTester.run("no-fixed-wait", localRules.rules["no-fixed-wait"], {
  valid: [
    { name: "an expect that retries", code: "await expect.poll(() => read()).toBe(1);" },
    { name: "a poll", code: "await expect.poll(() => read()).toBe(0);" },
    { name: "a fake timer", code: "vi.advanceTimersByTime(1000);" },
  ],
  invalid: [
    { name: "page.waitForTimeout", code: "await page.waitForTimeout(500);", errors: [{ messageId: "fixed" }] },
    { name: "a sleep built with setTimeout", code: "await new Promise((resolve) => setTimeout(resolve, 100));", errors: [{ messageId: "fixed" }] },
    { name: "window.setTimeout", code: "window.setTimeout(done, 100);", errors: [{ messageId: "fixed" }] },
  ],
});

ruleTester.run("verb-function-name", localRules.rules["verb-function-name"], {
  valid: [
    { name: "a function that starts with a verb", code: "function getBlocks() {}" },
    { name: "an arrow function that starts with a verb", code: "const buildCard = () => {};" },
    { name: "a method that starts with a verb", code: "class A { findLicense() {} }" },
    { name: "a predicate", code: "const isVisible = () => true; function hasLicense() {}" },
    { name: "a React hook", code: "function useWorkspaceLayout() {}" },
    { name: "a PascalCase component", code: "function ChatThread() {}\nconst Panel = () => null;" },
    { name: "a constructor and a getter", code: "class A { constructor() {} get title() { return 1; } }" },
    { name: "a value that is not a function", code: "const blocks = [];" },
    { name: "a predicate with a modal prefix", code: "const canEdit = () => true; const mustReview = () => true;" },
  ],
  invalid: [
    {
      name: "a name that reads as a noun phrase",
      code: "function blocksOf() {}",
      errors: [{ messageId: "verb", data: { name: "blocksOf" } }],
    },
    {
      name: "a preposition as the first word",
      code: "function fromHtml() {}",
      errors: [{ messageId: "verb", data: { name: "fromHtml" } }],
    },
    {
      name: "a noun or a third-person verb as the first word",
      code: "const htmlToText = () => {}; function issueList() {} const needsSkill = () => {};",
      errors: [{ messageId: "verb" }, { messageId: "verb" }, { messageId: "verb" }],
    },
    {
      name: "an arrow function and a method with no verb",
      code: "const cardOf = () => {};\nclass A { history() {} }",
      errors: [{ messageId: "verb" }, { messageId: "verb" }],
    },
    {
      name: "a verb stuck to another word",
      code: "const getter = () => {}; function reader() {}",
      errors: [{ messageId: "verb" }, { messageId: "verb" }],
    },
  ],
});

tsRuleTester.run("schema-file", localRules.rules["schema-file"], {
  valid: [
    { name: "a schema built in a Schema file", filename: "src/Schemas/ChatSchema.ts", code: "const ChatSchema = z.object({ id: z.string() });" },
    { name: "a schema imported from a Schema file", filename: SERVICE_FILE, code: "import { ChatSchema } from \"../Schemas/ChatSchema\"; ChatSchema.parse(x);" },
    { name: "a schema methods call on an imported schema", filename: "src/Utils/A.ts", code: "SCHEMA.safeParse(value);" },
  ],
  invalid: [
    {
      name: "z.object outside a Schema file",
      filename: SERVICE_FILE,
      code: "const ChatSchema = z.object({ id: z.string() });",
      errors: [{ messageId: "builder" }, { messageId: "builder" }],
    },
    {
      name: "z.uuid inside a function, and in a Protocol file",
      filename: PROTOCOL_FILE,
      code: "function f(id) { return z.uuid().safeParse(id); }",
      errors: [{ messageId: "builder" }],
    },
  ],
});

tsRuleTester.run("protocol-types-only", localRules.rules["protocol-types-only"], {
  valid: [
    {
      name: "types, interfaces, enums and imports in a Protocol file",
      filename: PROTOCOL_FILE,
      code: "import type { A } from \"x\"; export type B = A; export interface CPort { run(): void } export enum D { E } export type { A };",
    },
    { name: "values in a Schema file", filename: "src/Schemas/ChatSchema.ts", code: "export const MAX = 1; export function f() {}" },
    { name: "values in any other file", filename: SERVICE_FILE, code: "export const MAX = 1; export class A {}" },
  ],
  invalid: [
    { name: "a constant", filename: PROTOCOL_FILE, code: "export const MAX = 1;", errors: [{ messageId: "value" }] },
    { name: "a function and a class", filename: PROTOCOL_FILE, code: "function f() {} export class A {}", errors: [{ messageId: "value" }, { messageId: "value" }] },
  ],
});

tsRuleTester.run("interface-for-contracts", localRules.rules["interface-for-contracts"], {
  valid: [
    { name: "an interface that is the contract of a class", code: "interface ChatRepositoryPort { find(): void }" },
    { name: "a type", code: "type Chat = { id: string };" },
  ],
  invalid: [
    { name: "an interface for data", code: "interface Chat { id: string }", errors: [{ messageId: "contract" }] },
    { name: "an exported interface that extends", code: "export interface Chat extends Base { id: string }", errors: [{ messageId: "contract" }] },
  ],
});

tsRuleTester.run("no-inferred-type", localRules.rules["no-inferred-type"], {
  valid: [
    { name: "a declared type and a schema checked against it", code: "interface A { id: string } const SCHEMA: z.ZodType<A> = z.object({ id: z.string() });" },
    { name: "typeof import in a type", code: "type Module = typeof import(\"./module\");" },
    { name: "an as const object that only feeds a call", code: "const OPTIONS = { a: 1 } as const; call(OPTIONS);" },
    { name: "typeof a function or a global", code: "let timer: ReturnType<typeof setTimeout>; const f: typeof fetch = fetch;" },
    { name: "a scalar const assertion", code: "const part = { type: \"finish\" as const };" },
    { name: "a private static as const object", code: "class A { private static readonly OPTIONS = { a: 1 } as const; }" },
    { name: "an instance as const object", code: "class A { readonly options = { a: 1 } as const; }" },
    { name: "a typed static constant", code: "class A { static readonly OPTIONS: Record<Kind, number> = { a: 1 }; }" },
    { name: "a typed map", filename: "src/A.ts", code: "const KIND_TO_SIZE: Record<Kind, number> = { a: 1, b: 2 };" },
    { name: "a typed Map", filename: "src/A.ts", code: "const KIND_TO_SIZE = new Map<Kind, number>([[\"a\", 1]]);" },
    { name: "an object with mixed values", filename: "src/A.ts", code: "const STYLE = { color: INK, size: \"24px\" };" },
    { name: "a typed role constant", filename: "src/A.ts", code: "const ASSISTANT_ROLE: MessageRole = \"assistant\";" },
    { name: "a string whose name is not a known-value name", filename: "src/A.ts", code: "const BASE_URL = \"https://example.org\";" },
    { name: "an untyped map in a test", filename: "src/A.test.ts", code: UNTYPED_MAP_CODE },
    { name: "an untyped map in tooling", filename: "scripts/a.mjs", code: UNTYPED_MAP_CODE },
    { name: "a local variable in a function", filename: "src/A.ts", code: "function f() { const sizes = { a: 1, b: 2 }; return sizes; }" },
    { name: "a plain union", code: "type Level = \"low\" | \"high\";" },
    { name: "typeof as a runtime check", code: "const isText = typeof value === \"string\";" },
  ],
  invalid: [
    { name: "z.infer", code: "type A = z.infer<typeof SCHEMA>;", errors: [{ messageId: "zod" }] },
    { name: "z.input and z.output", code: "type A = z.input<Schema>; type B = z.output<Schema>;", errors: [{ messageId: "zod" }, { messageId: "zod" }] },
    { name: "typeof a constant", code: "type A = (typeof LEVELS)[number];", errors: [{ messageId: "typeof" }] },
    { name: "keyof typeof a constant", code: "type A = keyof typeof KIND_TO_SIZE;", errors: [{ messageId: "typeof" }] },
    { name: "an exported as const array", code: "export const LEVELS = [\"low\", \"high\"] as const;", errors: [{ messageId: "constant" }] },
    { name: "an as const object read by a type", code: "const KIND_TO_SIZE = { a: 1 } as const; type K = Foo<typeof KIND_TO_SIZE>;", errors: [{ messageId: "constant" }, { messageId: "typeof" }] },
    { name: "an untyped map of literals", filename: "src/A.ts", code: UNTYPED_MAP_CODE, errors: [{ messageId: "map" }] },
    { name: "an untyped Map", filename: "src/A.ts", code: "export const KIND_TO_SIZE = new Map([[\"a\", 1]]);", errors: [{ messageId: "map" }] },
    { name: "an untyped static map", filename: "src/A.ts", code: "class A { static readonly KIND_TO_SIZE = { a: 1, b: 2 }; }", errors: [{ messageId: "map" }] },
    { name: "a bare role string", filename: "src/A.ts", code: "const ASSISTANT_ROLE = \"assistant\";", errors: [{ messageId: "value" }] },
    { name: "a bare static status string", filename: "src/A.ts", code: "class A { static readonly UNAVAILABLE_STATUS = \"unavailable\"; }", errors: [{ messageId: "value" }] },
    { name: "a public static as const object", code: "class A { static readonly OPTIONS = { a: 1 } as const; }", errors: [{ messageId: "constant" }] },
    { name: "a public static as const array", code: "class A { public static readonly LEVELS = [\"a\"] as const; }", errors: [{ messageId: "constant" }] },
    { name: "an exported as const satisfies object", code: "export const KIND_TO_SIZE = { a: 1 } as const satisfies Record<Kind, number>;", errors: [{ messageId: "constant" }] },
    { name: "a static as const satisfies object", code: "class A { static readonly KIND_TO_SIZE = { a: 1 } as const satisfies Record<Kind, number>; }", errors: [{ messageId: "constant" }] },
  ],
});

tsRuleTester.run("arrow-function", localRules.rules["arrow-function"], {
  valid: [
    { name: "an arrow assigned to a const", code: "const readName = (user: User): string => user.name;" },
    { name: "a generator, which has no arrow form", code: "function* ids() { yield 1; }" },
    { name: "a function expression that generates", code: "const ids = function* () { yield 1; };" },
    { name: "a function that uses its own this", code: "function readName() { return this.name; }" },
    { name: "a function expression that uses its own this", code: "const readName = function () { return this.name; };" },
    { name: "a function that uses its own arguments", code: "function count() { return arguments.length; }" },
    { name: "an arrow inside a function still reads that function's this", code: "function readAll() { return items.map(() => this.name); }" },
    { name: "an overloaded function, with its signatures", code: "function parse(text: string): string; function parse(text: unknown): unknown { return text; }" },
    { name: "an assertion signature", code: "function assertText(value: unknown): asserts value is string { if (typeof value !== \"string\") { throw new Error(); } }" },
    { name: "a class method", code: "class Chat { readName() { return this.name; } }" },
    { name: "an object method", code: "const chat = { readName() { return 1; } };" },
  ],
  invalid: [
    {
      name: "a function declaration",
      code: "function readName(user) { return user.name; }",
      output: "const readName = (user) => { return user.name; };",
      errors: [{ messageId: "declaration", data: { name: "readName" } }],
    },
    {
      name: "an async declaration with types",
      code: "async function load(id: string): Promise<number> { return 1; }",
      output: "const load = async (id: string): Promise<number> => { return 1; };",
      errors: [{ messageId: "declaration" }],
    },
    {
      name: "an exported declaration",
      code: "export function parse(text: string) { return text; }",
      output: "export const parse = (text: string) => { return text; };",
      errors: [{ messageId: "declaration" }],
    },
    {
      name: "a default export with a name",
      code: "export default function Page() { return null; }",
      output: "const Page = () => { return null; };\n\nexport default Page;",
      errors: [{ messageId: "declaration" }],
    },
    {
      name: "a function expression assigned to a const",
      code: "const readName = function (user) { return user.name; };",
      output: "const readName = (user) => { return user.name; };",
      errors: [{ messageId: "expression", data: { name: "readName" } }],
    },
    {
      name: "a function that only nests a function with its own this",
      code: "function run() { return function () { return this.name; }; }",
      output: "const run = () => { return function () { return this.name; }; };",
      errors: [{ messageId: "declaration", data: { name: "run" } }],
    },
    {
      name: "a declaration inside a block",
      code: "if (ready) { function show() { return 1; } }",
      output: "if (ready) { const show = () => { return 1; }; }",
      errors: [{ messageId: "declaration" }],
    },
  ],
});
