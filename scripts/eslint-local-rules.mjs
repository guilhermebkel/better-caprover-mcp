import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import tseslint from "typescript-eslint";

const COMMENT_MARKER = /^(Why|@legacy): \S/;
const TOOL_DIRECTIVE = /^(eslint-disable|eslint-enable|@ts-expect-error|global )/;
const EQUALITY_OPERATORS = new Set(["===", "==", "!==", "!="]);
const MIN_CASES_FOR_MAP = 2;
const PASSTHROUGH_TYPES = new Set(["LogicalExpression", "UnaryExpression"]);
const EXIT_TYPES = new Set(["ReturnStatement", "ThrowStatement", "ContinueStatement", "BreakStatement"]);

const COMMENT_TYPE_TO_TRAITS = {
  Line: { isLineComment: true, isDirective: false },
  Block: { isLineComment: false, isDirective: false },
  Shebang: { isLineComment: false, isDirective: true },
};

const getFirstLine = (comment) => {
  return comment.value.split("\n").map((line) => line.replace(/^\s*\*?\s?/, "").trim()).find(Boolean) ?? "";
};

const commentMarker = {
  meta: {
    type: "suggestion",
    messages: { missing: "Delete this comment, or start it with \"Why:\" and the hidden rule it protects (or \"@legacy:\" for code that keeps old data or an old screen shape working)." },
  },
  create(context) {
    return {
      "Program:exit"() {
        let previousLineCommentEnd = -1;
        for (const comment of context.sourceCode.getAllComments()) {
          const { isLineComment, isDirective } = COMMENT_TYPE_TO_TRAITS[comment.type];
          // Why: consecutive line comments are one comment; only the first line carries the marker.
          const isContinuation = isLineComment && comment.loc.start.line === previousLineCommentEnd + 1;
          previousLineCommentEnd = isLineComment ? comment.loc.end.line : -1;
          const firstLine = getFirstLine(comment);
          const isAllowed = isDirective || COMMENT_MARKER.test(firstLine) || TOOL_DIRECTIVE.test(firstLine);
          if (!isContinuation && !isAllowed) {
            context.report({ loc: comment.loc, messageId: "missing" });
          }
        }
      },
    };
  },
};

const PROTOCOL_FILE = /Protocol\.ts$/;
const SCHEMA_FILE = /Schema\.ts$/;
const EXPORT_TYPES = new Set(["ExportNamedDeclaration", "ExportDefaultDeclaration"]);
const DECLARATION_SELECTOR = [
  "FunctionDeclaration",
  "ClassDeclaration",
  "MethodDefinition",
  "TSAbstractMethodDefinition",
  "TSDeclareFunction",
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
  "TSPropertySignature",
  "PropertyDefinition[value.type=/FunctionExpression$/]",
  "VariableDeclaration:has(> VariableDeclarator[init.type=/FunctionExpression$/])",
].join(", ");

const isToolComment = (comment) => {
  const { isDirective } = COMMENT_TYPE_TO_TRAITS[comment.type];
  return isDirective || TOOL_DIRECTIVE.test(getFirstLine(comment));
};

const findDeclarationAnchor = (node) => {
  return EXPORT_TYPES.has(node.parent?.type) ? node.parent : node;
};

const commentPlacement = {
  meta: {
    type: "suggestion",
    messages: {
      header: "Delete this file header: a comment sits next to the line whose hidden rule it explains.",
      protocol: "Delete this comment: a type doesn't apply rules. Put the rule next to the code that applies it, and units or meaning in the name.",
      declaration: "Move this comment next to the line inside where its rule happens, or delete it if the name and code already say it.",
    },
  },
  create(context) {
    const { sourceCode } = context;
    const isProtocol = PROTOCOL_FILE.test(context.filename);
    const firstCodeAt = sourceCode.ast.body[0]?.range[0] ?? Number.POSITIVE_INFINITY;
    const report = (comments, messageId) => {
      let previousEndLine = -1;
      for (const comment of comments.filter((candidate) => !isToolComment(candidate))) {
        const isContinuation = comment.loc.start.line === previousEndLine + 1;
        previousEndLine = comment.loc.end.line;
        if (!isContinuation) {
          context.report({ loc: comment.loc, messageId });
        }
      }
    };
    const reportDeclaration = (node) => {
      if (isProtocol) {
        return;
      }
      const leading = sourceCode.getCommentsBefore(findDeclarationAnchor(node));
      report(leading.filter((comment) => comment.range[0] >= firstCodeAt), "declaration");
    };
    return {
      "Program"() {
        const comments = sourceCode.getAllComments();
        if (isProtocol) {
          report(comments, "protocol");
          return;
        }
        report(comments.filter((comment) => comment.range[1] <= firstCodeAt), "header");
      },
      [DECLARATION_SELECTOR]: reportDeclaration,
    };
  },
};

const NODE_TYPE_TO_IS_FIXED = new Map([
  ["Literal", (node) => typeof node.value === "string" && node.value !== ""],
  ["TemplateLiteral", (node) => node.expressions.length === 0 && node.quasis[0]?.value.cooked !== ""],
]);

const isFixedValue = (node) => {
  return NODE_TYPE_TO_IS_FIXED.get(node.type)?.(node) ?? false;
};

const isTypeCheck = (subject) => {
  return subject.type === "UnaryExpression" && subject.operator === "typeof";
};

const getComparedSubject = (comparison) => {
  if (!EQUALITY_OPERATORS.has(comparison.operator)) {
    return undefined;
  }
  const isRightFixed = isFixedValue(comparison.right);
  if (isRightFixed === isFixedValue(comparison.left)) {
    return undefined;
  }
  const subject = isRightFixed ? comparison.left : comparison.right;
  return isTypeCheck(subject) ? undefined : subject;
};

const getLastStatement = (statement) => {
  return Array.isArray(statement.body) ? statement.body.at(-1) : statement;
};

const isGuard = (ifStatement) => {
  const lastStatement = getLastStatement(ifStatement.consequent);
  return !ifStatement.alternate && lastStatement !== undefined && EXIT_TYPES.has(lastStatement.type);
};

const DECISION_TYPE_TO_IS_BRANCH = new Map([
  ["IfStatement", (ifStatement) => !isGuard(ifStatement)],
  ["ConditionalExpression", () => true],
]);

const isBranchCondition = (comparison) => {
  let condition = comparison;
  while (PASSTHROUGH_TYPES.has(condition.parent?.type)) {
    condition = condition.parent;
  }
  const decision = condition.parent;
  const isBranch = DECISION_TYPE_TO_IS_BRANCH.get(decision?.type);
  return decision?.test === condition && isBranch !== undefined && isBranch(decision);
};

const literalDispatch = {
  meta: {
    type: "suggestion",
    messages: {
      repeated: "\"{{subject}}\" is compared with a fixed value again in this function. Dispatch through a Record<Key, Handler> map instead.",
      branch: "This branch picks code by comparing \"{{subject}}\" with a fixed value. Dispatch through a Record<Key, Handler> map, or make it a guard that leaves early.",
      switchCases: "This switch dispatches on fixed values. Use a Record<Key, Handler> map instead.",
    },
  },
  create(context) {
    const scopes = [new Map()];
    const record = (comparison) => {
      const subject = getComparedSubject(comparison);
      if (!subject) {
        return;
      }
      const key = context.sourceCode.getText(subject).replaceAll("?.", ".");
      const seen = scopes.at(-1);
      const count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      if (count >= MIN_CASES_FOR_MAP) {
        context.report({ node: comparison, messageId: "repeated", data: { subject: key } });
        return;
      }
      if (isBranchCondition(comparison)) {
        context.report({ node: comparison, messageId: "branch", data: { subject: key } });
      }
    };
    return {
      ":function"() {
        scopes.push(new Map());
      },
      ":function:exit"() {
        scopes.pop();
      },
      "BinaryExpression"(node) {
        record(node);
      },
      "SwitchStatement"(node) {
        const fixedCases = node.cases.filter((switchCase) => switchCase.test && isFixedValue(switchCase.test));
        if (fixedCases.length >= MIN_CASES_FOR_MAP) {
          context.report({ node, messageId: "switchCases" });
        }
      },
    };
  },
};

const getFileStem = (filename) => {
  const base = filename.split(/[\\/]/).at(-1) ?? "";
  return base.replace(/\.[^.]+$/, "");
};

const classMatchesFile = {
  meta: {
    type: "suggestion",
    messages: { mismatch: "Class \"{{name}}\" lives in \"{{file}}\"; name the file after its one class." },
  },
  create(context) {
    const stem = getFileStem(context.filename);
    return {
      "Program > ClassDeclaration, Program > ExportNamedDeclaration > ClassDeclaration"(node) {
        const name = node.id?.name;
        if (name && name !== stem) {
          context.report({ node: node.id, messageId: "mismatch", data: { name, file: stem } });
        }
      },
    };
  },
};

const DESCRIBE_TARGET = /^([A-Z]\w*)\.(\w+)\(\)$/;
const HIDDEN_ACCESSIBILITY = new Set(["private", "protected"]);
const TEST_SUFFIX = /\.test$/;
const SOURCE_EXTENSION = ".ts";

const isPublicMember = (member) => {
  const isNamed = member.key?.type === "Identifier";
  return isNamed && !HIDDEN_ACCESSIBILITY.has(member.accessibility) && member.kind !== "constructor";
};

const listPublicMethods = (sourcePath, className) => {
  const { ast: program } = tseslint.parser.parseForESLint(readFileSync(sourcePath, "utf8"), { sourceType: "module" });
  const declarations = program.body.map((node) => node.declaration ?? node);
  const classNode = declarations.find((node) => node.type === "ClassDeclaration" && node.id?.name === className);
  const members = classNode?.body.body ?? [];
  return new Set(members.filter((member) => isPublicMember(member)).map((member) => member.key.name));
};

const getCalleeName = (statement) => {
  return statement.expression?.callee?.name;
};

const describeTarget = {
  meta: {
    type: "suggestion",
    messages: {
      format: "Name the outer describe \"{{className}}.<method>()\": the class this file tests and the public method the tests go through.",
      otherClass: "This file tests {{className}}; the outer describe names \"{{named}}\".",
      notPublic: "{{className}} has no public method \"{{method}}\" in {{source}}; test through a public method.",
      outside: "Put this test inside a describe named \"{{className}}.<method>()\".",
    },
  },
  create(context) {
    const className = getFileStem(context.filename).replace(TEST_SUFFIX, "");
    const testFolder = dirname(resolve(context.filename));
    const sourcePath = join(testFolder, `${className}${SOURCE_EXTENSION}`);
    let publicMethods;
    const listMethodsOfSource = () => {
      publicMethods ??= existsSync(sourcePath) ? listPublicMethods(sourcePath, className) : new Set();
      return publicMethods;
    };
    const checkDescribe = (call) => {
      const title = call.arguments[0];
      const match = DESCRIBE_TARGET.exec(typeof title?.value === "string" ? title.value : "");
      if (!match) {
        context.report({ node: title ?? call, messageId: "format", data: { className } });
        return;
      }
      const [, named, method] = match;
      if (named !== className) {
        context.report({ node: title, messageId: "otherClass", data: { className, named } });
        return;
      }
      if (!listMethodsOfSource().has(method)) {
        context.report({ node: title, messageId: "notPublic", data: { className, method, source: `${className}${SOURCE_EXTENSION}` } });
      }
    };
    const reportOutside = (call) => {
      context.report({ node: call, messageId: "outside", data: { className } });
    };
    const CALLEE_TO_CHECK = { describe: checkDescribe, it: reportOutside, test: reportOutside };
    return {
      "Program"(program) {
        for (const statement of program.body) {
          const name = getCalleeName(statement);
          const check = Object.hasOwn(CALLEE_TO_CHECK, name ?? "") ? CALLEE_TO_CHECK[name] : undefined;
          check?.(statement.expression);
        }
      },
    };
  },
};

const MAP_TYPE_NAMES = new Set(["Record", "Map", "ReadonlyMap"]);
const WRAPPER_TYPE_NAMES = new Set(["Partial", "Readonly", "Required"]);
const MAP_NAME = /To[A-Z0-9]|_TO_/;

const mapTypeOf = (typeNode) => {
  const name = typeNode?.typeName?.name;
  const typeArguments = typeNode?.typeArguments?.params ?? [];
  if (WRAPPER_TYPE_NAMES.has(name)) {
    return mapTypeOf(typeArguments[0]);
  }
  return MAP_TYPE_NAMES.has(name) ? typeArguments : undefined;
};

const isMapOfUnknown = (typeArguments) => {
  return typeArguments[1]?.type === "TSUnknownKeyword";
};

const isMapConstruction = (init) => {
  return init?.type === "NewExpression" && MAP_TYPE_NAMES.has(init.callee.name);
};

const mapName = {
  meta: {
    type: "suggestion",
    messages: {
      unnamed: "Name this map after its key and value (\"{{example}}\"), so a reader knows what a lookup takes and gives.",
    },
  },
  create(context) {
    const check = (nameNode, typeNode, init) => {
      const typeArguments = mapTypeOf(typeNode);
      const isMap = (typeArguments !== undefined && !isMapOfUnknown(typeArguments)) || isMapConstruction(init);
      const name = nameNode?.name;
      if (isMap && name && !MAP_NAME.test(name)) {
        context.report({ node: nameNode, messageId: "unnamed", data: { example: "suggestionIdToCost" } });
      }
    };
    return {
      "VariableDeclarator"(node) {
        check(node.id, node.id.typeAnnotation?.typeAnnotation, node.init);
      },
      "PropertyDefinition, TSPropertySignature"(node) {
        check(node.key, node.typeAnnotation?.typeAnnotation, node.value);
      },
      "TSTypeAliasDeclaration"(node) {
        check(node.id, node.typeAnnotation);
      },
      ":function > Identifier.params"(node) {
        check(node, node.typeAnnotation?.typeAnnotation);
      },
    };
  },
};

const LIST_TYPE_NAMES = new Set(["Array", "ReadonlyArray"]);
const SET_TYPE_NAMES = new Set(["Set", "ReadonlySet"]);

const isStringKeyword = (typeNode) => {
  return typeNode?.type === "TSStringKeyword";
};

const unwrapRecord = (typeNode) => {
  let current = typeNode;
  while (current?.type === "TSTypeReference" && WRAPPER_TYPE_NAMES.has(current.typeName.name)) {
    current = current.typeArguments?.params[0];
  }
  return current;
};

const isRecordOfStringKeys = (typeNode) => {
  const record = unwrapRecord(typeNode);
  return record?.type === "TSTypeReference" && record.typeName.name === "Record" && isStringKeyword(record.typeArguments?.params[0]);
};

const TYPE_TO_LIST_CHECK = new Map([
  ["TSArrayType", (node) => isStringKeyword(node.elementType)],
  ["TSTypeReference", (node) => (LIST_TYPE_NAMES.has(node.typeName.name) || SET_TYPE_NAMES.has(node.typeName.name))
    && isStringKeyword(node.typeArguments?.params[0])],
]);

const isListOfStrings = (typeNode) => {
  if (typeNode?.type === "TSTypeOperator") {
    return typeNode.operator === "readonly" && isListOfStrings(typeNode.typeAnnotation);
  }
  const check = typeNode ? TYPE_TO_LIST_CHECK.get(typeNode.type) : undefined;
  return check?.(typeNode) ?? false;
};

const hasOnlyFixedKeys = (objectNode) => {
  return objectNode.properties.length > 0
    && objectNode.properties.every((property) => property.type === "Property" && !property.computed);
};

const hasOnlyFixedStrings = (arrayNode) => {
  return arrayNode.elements.length > 0
    && arrayNode.elements.every((element) => element?.type === "Literal" && typeof element.value === "string");
};

const isNewSetOfFixedStrings = (init) => {
  const isNewSet = init.callee.name === "Set";
  const items = init.arguments[0];
  return isNewSet && items?.type === "ArrayExpression" && hasOnlyFixedStrings(items);
};

const MAP_ONLY_TYPE_NAMES = new Set(["Map", "ReadonlyMap"]);

const isMapOfStringKeys = (typeNode) => {
  return typeNode?.type === "TSTypeReference" && MAP_ONLY_TYPE_NAMES.has(typeNode.typeName.name)
    && isStringKeyword(typeNode.typeArguments?.params[0]);
};

const hasOnlyFixedEntries = (arrayNode) => {
  return arrayNode?.type === "ArrayExpression" && arrayNode.elements.length > 0
    && arrayNode.elements.every((entry) => entry?.type === "ArrayExpression" && entry.elements[0]?.type === "Literal"
      && typeof entry.elements[0].value === "string");
};

const isNewMapOfFixedKeys = (init) => {
  return init.callee.name === "Map" && hasOnlyFixedEntries(init.arguments[0]);
};

const buildNewExpressionMessage = (typeNode, init) => {
  if (isNewSetOfFixedStrings(init) && isListOfStrings(typeNode)) {
    return "values";
  }
  const isStringKeyed = isMapOfStringKeys(typeNode) || isStringKeyword(init.typeArguments?.params[0]);
  return isStringKeyed && isNewMapOfFixedKeys(init) ? "keys" : null;
};

const INIT_TO_DECLARED_MESSAGE = new Map([
  ["ObjectExpression", (typeNode, init) => (isRecordOfStringKeys(typeNode) && hasOnlyFixedKeys(init) ? "keys" : null)],
  ["ArrayExpression", (typeNode, init) => (isListOfStrings(typeNode) && hasOnlyFixedStrings(init) ? "values" : null)],
  ["NewExpression", buildNewExpressionMessage],
]);

const knownKeys = {
  meta: {
    type: "suggestion",
    messages: {
      keys: "The keys here are all known: type them as a union (Record<SomeName, ...>) instead of string, so a typo fails to compile.",
      values: "The values here are all known: type the list or set with a union (readonly SomeName[], ReadonlySet<SomeName>) instead of string.",
    },
  },
  create(context) {
    const check = (typeNode, init, reportNode) => {
      const messageId = init ? INIT_TO_DECLARED_MESSAGE.get(init.type)?.(typeNode, init) : null;
      if (messageId) {
        context.report({ node: reportNode, messageId });
      }
    };
    return {
      "VariableDeclarator"(node) {
        check(node.id.typeAnnotation?.typeAnnotation, node.init, node.id);
      },
      "PropertyDefinition"(node) {
        check(node.typeAnnotation?.typeAnnotation, node.value, node.key);
      },
    };
  },
};

const ERROR_BASE = /(^|[A-Z])Error$/;
const ERRORS_DIR = /(^|\/)src\/Errors\/[^/]+\.ts$/;

const findErrorProblem = (isInErrorsFolder, name) => {
  if (!isInErrorsFolder) {
    return "folder";
  }
  return name.endsWith("Error") ? null : "suffix";
};

const errorLocation = {
  meta: {
    type: "suggestion",
    messages: {
      folder: "Errors live in src/Errors/<Name>Error.ts, one class per file. Move \"{{name}}\" there.",
      suffix: "An error class is named after what went wrong and ends in \"Error\": rename \"{{name}}\".",
    },
  },
  create(context) {
    const isInErrorsFolder = ERRORS_DIR.test(context.filename.replaceAll("\\", "/"));
    return {
      "ClassDeclaration[superClass.type='Identifier']"(node) {
        const name = node.id?.name ?? "";
        const messageId = ERROR_BASE.test(node.superClass.name) ? findErrorProblem(isInErrorsFolder, name) : null;
        if (messageId) {
          context.report({ node: node.id ?? node, data: { name }, messageId });
        }
      },
    };
  },
};

const OPERATIONS_FILE = /(^|\/)src\/Operations\/[^/]+\.ts$/;
const OPERATION_CLASS = /^\w+Operation$/;
const OPERATION_SUFFIX = /Operation$/;

const isOperationsFile = (filename) => {
  return OPERATIONS_FILE.test(filename.replaceAll("\\", "/"));
};

const getOperationName = (className) => {
  const baseName = className.replace(OPERATION_SUFFIX, "");
  return baseName.charAt(0).toLowerCase() + baseName.slice(1);
};

const operationName = {
  meta: {
    type: "problem",
    messages: {
      missing: "Operation \"{{name}}\" has no static NAME: add `static readonly NAME = \"{{expected}}\";`.",
      mismatch: "Operation \"{{name}}\" has NAME \"{{actual}}\"; it must be \"{{expected}}\", the class name without Operation in camelCase.",
    },
  },
  create(context) {
    if (!isOperationsFile(context.filename)) {
      return {};
    }
    return {
      "ClassDeclaration"(node) {
        const name = node.id?.name ?? "";
        if (!OPERATION_CLASS.test(name)) {
          return;
        }
        const expected = getOperationName(name);
        const nameProperty = node.body.body.find((member) => member.type === "PropertyDefinition" && member.key?.name === "NAME");
        if (nameProperty === undefined) {
          context.report({ node: node.id, messageId: "missing", data: { name, expected } });
          return;
        }
        // Why: `NAME = "x" satisfies OperationName` wraps the literal, so the value is read through the wrapper.
        const actual = nameProperty.value?.value ?? nameProperty.value?.expression?.value;
        if (actual !== expected) {
          context.report({ node: nameProperty, messageId: "mismatch", data: { name, actual, expected } });
        }
      },
    };
  },
};

const OPERATION_PORT_NAME = "OperationPort";

const operationPort = {
  meta: {
    type: "problem",
    messages: {
      missing: "Operation \"{{name}}\" in {{file}} must implement OperationPort (src/Protocols/OperationProtocol.ts): declare its description, inputSchema, risk and execute.",
    },
  },
  create(context) {
    if (!isOperationsFile(context.filename)) {
      return {};
    }
    return {
      "ClassDeclaration"(node) {
        const name = node.id?.name ?? "";
        const implementsPort = node.implements?.some((heritage) => heritage.expression.name === OPERATION_PORT_NAME);
        if (OPERATION_CLASS.test(name) && !implementsPort) {
          context.report({ node: node.id, messageId: "missing", data: { name, file: getFileStem(context.filename) } });
        }
      },
    };
  },
};

const noFixedWait = {
  meta: {
    type: "problem",
    messages: { fixed: "Wait for the condition, not for time: use an expect that retries (expect.poll, vi.waitFor) or a fake timer." },
  },
  create(context) {
    return {
      "CallExpression[callee.name=/^(waitForTimeout|setTimeout)$/], CallExpression[callee.property.name=/^(waitForTimeout|setTimeout)$/]"(node) {
        context.report({ node, messageId: "fixed" });
      },
    };
  },
};

const ALLOWED_VERBS = new Set([
  "get", "find", "build", "parse", "read", "load", "save", "create", "update", "delete", "remove", "add", "list",
  "render", "format", "convert", "resolve", "map", "merge", "filter", "select", "check", "validate", "send", "fetch",
  "open", "close", "handle", "apply", "compute", "search", "show", "write", "insert", "set", "register", "start",
  "stop", "run", "execute", "emit", "log", "redact", "sanitize", "normalize", "extract", "collect", "count", "sort",
  "split", "join", "truncate", "wrap", "assert", "ensure", "mark", "reset", "clear", "scroll", "focus", "toggle",
  "submit", "upload", "download", "generate", "assign", "attach", "detect", "classify", "score", "rank", "match",
  "enrich", "decode", "encode", "hash", "sign", "verify", "authorize", "login", "logout", "retry", "wait", "sleep",
  "stream", "consume", "publish", "subscribe", "track", "record", "mask", "strip", "trim", "pick", "omit", "group",
  "index", "seed", "migrate", "connect", "disconnect", "invoke", "call", "dispatch", "enqueue", "schedule", "cancel",
  "abort", "approve", "reject", "accept", "confirm", "dismiss", "expire", "refresh", "sync", "copy", "move", "rename",
  "replace", "reduce", "flatten", "dedupe", "deduplicate", "chunk", "limit", "cap", "clamp", "round", "estimate",
  "calculate", "measure", "summarize", "describe", "explain", "translate", "transform", "serialize", "deserialize",
  "stringify", "interpolate", "inject", "provide", "wire", "bind", "unwrap", "peek", "pop", "push", "shift", "take",
  "drop", "skip", "keep", "hide", "display", "draw", "paint", "mount", "unmount", "init", "initialize", "prepare",
  "finish", "complete", "commit", "rollback", "lock", "unlock", "acquire", "release", "claim", "grant", "revoke",
  "deny", "block", "allow", "enable", "disable", "ask", "answer", "reply", "notify", "warn", "fail", "throw", "catch",
  "report", "trace", "probe", "ping", "poll", "watch", "scan", "crawl", "visit", "walk", "traverse", "diff",
  "compare", "order", "rate", "label", "tag", "name", "pin", "unpin", "pad", "escape", "unescape", "quote", "fix",
  "repair", "patch", "post", "put", "make", "use", "stub", "end", "capture", "plan", "stage", "respond",
  "guard", "observe", "unobserve", "say", "settle", "link", "append", "exchange", "discard", "clean", "combine", "error", "request",
]);
// Why: the set holds base-form verbs only; prepositions, modals and third-person forms (`fromHtml`, `needsSkill`) are not
// verbs in it. Predicates (`isX`, `hasX`) and hooks (`useX`) are named by their prefix instead.
const EXEMPT_NAME = /^((use|on|is|has|should|can|must|was|did)[A-Z]|constructor$|[A-Z]|_)/;
const CAMEL_WORD = /^[a-z0-9]+/;
const FUNCTION_VALUE = "[value.type='ArrowFunctionExpression'], [value.type='FunctionExpression']";
const FUNCTION_INIT = "[init.type='ArrowFunctionExpression'], [init.type='FunctionExpression']";

const verbFunctionName = {
  meta: {
    type: "suggestion",
    messages: {
      verb: "Name \"{{ name }}\" must start with a verb in base form, like get, find, build, parse, read, save or resolve.",
    },
  },
  create(context) {
    const check = (nameNode) => {
      const name = nameNode?.name;
      if (typeof name !== "string" || EXEMPT_NAME.test(name)) {
        return;
      }
      if (!ALLOWED_VERBS.has(CAMEL_WORD.exec(name)?.[0] ?? "")) {
        context.report({ node: nameNode, messageId: "verb", data: { name } });
      }
    };
    return {
      "FunctionDeclaration, TSDeclareFunction": (node) => check(node.id),
      "MethodDefinition[kind='method'][computed=false], TSAbstractMethodDefinition[kind='method'][computed=false]": (node) => check(node.key),
      [`PropertyDefinition[computed=false]:matches(${FUNCTION_VALUE})`]: (node) => check(node.key),
      [`VariableDeclarator:matches(${FUNCTION_INIT})`]: (node) => check(node.id),
    };
  },
};

const BARE_STRING_FIELD_NAMES = new Set(["type", "kind", "state", "status", "role", "mode", "phase"]);
const NULLISH_TYPE_KEYWORDS = new Set(["TSNullKeyword", "TSUndefinedKeyword"]);

const hasBareString = (typeNode) => {
  if (typeNode?.type === "TSUnionType") {
    const isStringOrNullish = (member) => isStringKeyword(member) || NULLISH_TYPE_KEYWORDS.has(member.type);
    return typeNode.types.some(isStringKeyword) && typeNode.types.every(isStringOrNullish);
  }
  return isStringKeyword(typeNode);
};

const noBareStringField = {
  meta: {
    type: "suggestion",
    messages: {
      bare: "\"{{name}}\" holds one of several known values: type it with a declared union instead of string.",
    },
  },
  create(context) {
    return {
      "TSPropertySignature[computed=false]"(node) {
        const name = node.key.name ?? node.key.value;
        if (BARE_STRING_FIELD_NAMES.has(name) && hasBareString(node.typeAnnotation?.typeAnnotation)) {
          context.report({ node: node.key, messageId: "bare", data: { name } });
        }
      },
    };
  },
};

const ZODDER_NAMES = new Set(["z", "zod"]);
const NON_BUILDER_MEMBERS = new Set(["toJSONSchema", "flattenError", "treeifyError", "prettifyError", "config"]);

const schemaFile = {
  meta: {
    type: "suggestion",
    messages: {
      builder: "Schemas live in a file named <Name>Schema.ts. Move this Zod builder there and import the schema here.",
    },
  },
  create(context) {
    if (SCHEMA_FILE.test(context.filename)) {
      return {};
    }
    return {
      "CallExpression[callee.type='MemberExpression']"(node) {
        const { object, property } = node.callee;
        const isZodCall = object.type === "Identifier" && ZODDER_NAMES.has(object.name) && !NON_BUILDER_MEMBERS.has(property.name);
        if (isZodCall) {
          context.report({ node, messageId: "builder" });
        }
      },
    };
  },
};

const TYPE_ONLY_STATEMENTS = new Set([
  "ImportDeclaration", "TSTypeAliasDeclaration", "TSInterfaceDeclaration", "TSEnumDeclaration", "ExportAllDeclaration",
]);

const isTypeOnlyStatement = (statement) => {
  if (TYPE_ONLY_STATEMENTS.has(statement.type)) {
    return true;
  }
  const isExport = statement.type === "ExportNamedDeclaration";
  return isExport && (statement.declaration === null || TYPE_ONLY_STATEMENTS.has(statement.declaration.type));
};

const protocolTypesOnly = {
  meta: {
    type: "problem",
    messages: {
      value: "A <Name>Protocol.ts file holds types only (type, interface, enum). Move this value to the <Name>Schema.ts file next to it.",
    },
  },
  create(context) {
    if (!PROTOCOL_FILE.test(context.filename)) {
      return {};
    }
    return {
      "Program > *"(statement) {
        if (!isTypeOnlyStatement(statement)) {
          context.report({ node: statement, messageId: "value" });
        }
      },
    };
  },
};

const CONTRACT_NAME = /Port$/;

const interfaceForContracts = {
  meta: {
    type: "suggestion",
    messages: {
      contract: "Declare \"{{name}}\" with type. interface is only for the contract of a class, named <Name>Port.",
    },
  },
  create(context) {
    return {
      "TSInterfaceDeclaration"(node) {
        if (!CONTRACT_NAME.test(node.id.name)) {
          context.report({ node: node.id, messageId: "contract", data: { name: node.id.name } });
        }
      },
    };
  },
};

const ZOD_INFER_NAMES = new Set(["infer", "input", "output"]);

const isConstAssertion = (node) => {
  return node.typeAnnotation.type === "TSTypeReference" && node.typeAnnotation.typeName.name === "const";
};

const LITERAL_CONTAINER_TYPES = new Set(["ArrayExpression", "ObjectExpression"]);
const CONSTANT_NAME = /^[A-Z][A-Z0-9_]+$/;

const isConstantName = (exprName) => {
  const name = exprName.right?.name ?? exprName.name;
  return name !== undefined && CONSTANT_NAME.test(name);
};

const isZodInferArgument = (node) => {
  const reference = node.parent.parent;
  const name = reference?.typeName;
  return node.parent.type === "TSTypeParameterInstantiation" && name?.type === "TSQualifiedName"
    && ZODDER_NAMES.has(name.left.name) && ZOD_INFER_NAMES.has(name.right.name);
};

const PRODUCT_FILE = /(^|\/)src\/[^/].*\.tsx?$/;
const TEST_FILE = /\.test\.tsx?$/;
const SATISFIES_TYPES = new Set(["TSSatisfiesExpression"]);
const PRIMITIVE_VALUE_TYPES = new Set(["string", "number", "boolean"]);
const KNOWN_VALUE_NAME = new RegExp(`(^|_)(${[...BARE_STRING_FIELD_NAMES].map((name) => name.toUpperCase()).join("|")})$`);

const isPrimitiveLiteral = (node) => {
  return node?.type === "Literal" && PRIMITIVE_VALUE_TYPES.has(typeof node.value);
};

const isLiteralMap = (objectNode) => {
  const { properties } = objectNode;
  return properties.length > 1 && properties.every((property) => property.type === "Property" && !property.computed
    && isPrimitiveLiteral(property.value));
};

const UNTYPED_MAP_NAMES = new Set(["Map"]);

const isUntypedMap = (newNode) => {
  return UNTYPED_MAP_NAMES.has(newNode.callee.name) && !newNode.typeArguments && newNode.arguments[0]?.type === "ArrayExpression";
};

const INIT_TO_UNTYPED_MESSAGE = new Map([
  ["ObjectExpression", (init) => (isLiteralMap(init) ? "map" : null)],
  ["NewExpression", (init) => (isUntypedMap(init) ? "map" : null)],
  ["Literal", (init, name) => (typeof init.value === "string" && KNOWN_VALUE_NAME.test(name) ? "value" : null)],
]);

const findUntypedProblem = (init, name) => {
  return (init && name) ? INIT_TO_UNTYPED_MESSAGE.get(init.type)?.(init, name) ?? null : null;
};

const findConstContainer = (init) => {
  if (!init) {
    return null;
  }
  // Why: `{ ... } as const satisfies T` is the same shortcut as `{ ... } as const`, written the other way round.
  const inner = SATISFIES_TYPES.has(init.type) ? init.expression : init;
  const isConstContainer = inner.type === "TSAsExpression" && isConstAssertion(inner) && LITERAL_CONTAINER_TYPES.has(inner.expression.type);
  return isConstContainer ? inner : null;
};

const noInferredType = {
  meta: {
    type: "suggestion",
    messages: {
      zod: "Declare the type (interface or type) and annotate the schema with z.ZodType<Declared>; do not infer it with z.{{name}}.",
      typeof: "Write the type out as a union or an interface and check the constant against it; do not derive a type from a value.",
      constant: "Do not use `as const` on an array or an object to make a type: declare the type and annotate the constant with it.",
      map: "This map has no declared type: annotate it with a Record or a Map whose keys are a union, so a typo fails to compile.",
      value: "\"{{name}}\" holds one value of a type: annotate it with that type instead of leaving it as a bare string.",
    },
  },
  create(context) {
    // Why: tests build their own fixtures, and scripts and config are tooling; only product code declares the types of its constants.
    const isProductFile = PRODUCT_FILE.test(context.filename) && !TEST_FILE.test(context.filename);
    const report = (init, typeNode, nameNode) => {
      const messageId = typeNode || !isProductFile ? null : findUntypedProblem(init, nameNode?.name);
      if (messageId) {
        context.report({ messageId, node: nameNode, data: { name: nameNode.name } });
      }
    };
    return {
      "Program > VariableDeclaration > VariableDeclarator, ExportNamedDeclaration > VariableDeclaration > VariableDeclarator"(node) {
        report(node.init, node.id.typeAnnotation, node.id);
      },
      "PropertyDefinition[static=true]"(node) {
        report(node.value, node.typeAnnotation, node.key);
        const container = findConstContainer(node.value);
        // Why: a static member that is not private is read from outside the class, like an export.
        const isPrivate = node.accessibility === "private" || node.key.type === "PrivateIdentifier";
        if (container && !isPrivate) {
          context.report({ node: container, messageId: "constant" });
        }
      },
      "TSTypeReference > TSQualifiedName"(node) {
        const isZod = node.left.type === "Identifier" && ZODDER_NAMES.has(node.left.name);
        if (isZod && ZOD_INFER_NAMES.has(node.right.name)) {
          context.report({ node, messageId: "zod", data: { name: node.right.name } });
        }
      },
      "TSTypeQuery"(node) {
        if (isConstantName(node.exprName) && !isZodInferArgument(node)) {
          context.report({ node, messageId: "typeof" });
        }
      },
      "VariableDeclarator"(node) {
        const container = findConstContainer(node.init);
        const variable = context.sourceCode.getDeclaredVariables(node)[0];
        const isTypeSource = variable?.references.some((reference) => reference.identifier.parent.type === "TSTypeQuery");
        const isExported = EXPORT_TYPES.has(node.parent.parent?.type);
        if (container && (isTypeSource || isExported)) {
          context.report({ node: container, messageId: "constant" });
        }
      },

    };
  },
};

const NOT_OWN_THIS_SCOPE_TYPES = new Set(["FunctionDeclaration", "FunctionExpression", "ClassBody"]);
const IGNORED_NODE_KEYS = new Set(["parent", "loc", "range", "typeAnnotation"]);

const getChildNodes = (node) => {
  return Object.entries(node)
    .filter(([key]) => !IGNORED_NODE_KEYS.has(key))
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter((value) => typeof value?.type === "string");
};

const isPropertyName = (node) => {
  const { parent } = node;
  return !parent.computed && (parent.property === node || parent.key === node);
};

const isOwnThisOrArguments = (node) => {
  const isArgumentsName = node.name === "arguments" && !isPropertyName(node);
  return node.type === "ThisExpression" || isArgumentsName;
};

const readOwnThisOrArguments = (node) => {
  // Why: an arrow has no `this` or `arguments` of its own, so a function that reads them has to stay a function.
  if (isOwnThisOrArguments(node)) {
    return true;
  }
  if (NOT_OWN_THIS_SCOPE_TYPES.has(node.type)) {
    return false;
  }
  return getChildNodes(node).some(readOwnThisOrArguments);
};

const isAssertionSignature = (node) => {
  return node.returnType?.typeAnnotation?.type === "TSTypePredicate" && node.returnType.typeAnnotation.asserts === true;
};

const isConvertible = (node) => {
  // Why: an arrow cannot be a generator, cannot declare an assertion signature and has its own `this`, so these stay functions.
  return !node.generator && !isAssertionSignature(node) && !getChildNodes(node).some(readOwnThisOrArguments);
};

const arrowFunction = {
  meta: {
    type: "suggestion",
    fixable: "code",
    messages: {
      declaration: "Use an arrow function instead of the function declaration \"{{ name }}\".",
      expression: "Use an arrow function instead of the function expression assigned to \"{{ name }}\".",
    },
  },
  create(context) {
    const { sourceCode } = context;

    const buildArrow = (node, afterName) => {
      // Why: an arrow keeps the parameters, the return type and the body text; only the `function` keyword goes.
      const asyncPrefix = node.async ? "async " : "";
      const signature = sourceCode.text.slice(afterName, node.body.range[0]).trim();
      return `${asyncPrefix}${signature} => ${sourceCode.getText(node.body)}`;
    };

    const reportDeclaration = (node) => {
      const { id } = node;
      // Why: an overloaded function needs its signatures declared with `function`, so the implementation keeps the form too.
      const isOverloaded = id && sourceCode.getDeclaredVariables(node)[0]?.defs.length > 1;
      if (isOverloaded || !isConvertible(node)) {
        return;
      }
      const name = id?.name ?? "default";
      const arrow = buildArrow(node, id ? id.range[1] : sourceCode.getFirstToken(node, { filter: (token) => token.value === "function" }).range[1]);
      const isDefaultExport = node.parent.type === "ExportDefaultDeclaration";
      const fix = (fixer) => {
        if (isDefaultExport && id) {
          return fixer.replaceText(node.parent, `const ${name} = ${arrow};\n\nexport default ${name};`);
        }
        if (isDefaultExport) {
          return fixer.replaceText(node.parent, `export default ${arrow};`);
        }
        return fixer.replaceText(node, `const ${name} = ${arrow};`);
      };
      context.report({ node: id ?? node, messageId: "declaration", data: { name }, fix });
    };

    const reportExpression = (declarator, node) => {
      if (!isConvertible(node)) {
        return;
      }
      const name = declarator.id.name;
      const functionKeyword = sourceCode.getFirstToken(node, { filter: (token) => token.value === "function" });
      const arrow = buildArrow(node, node.id ? node.id.range[1] : functionKeyword.range[1]);
      context.report({
        node,
        messageId: "expression",
        data: { name },
        fix: (fixer) => fixer.replaceText(node, arrow),
      });
    };

    return {
      "FunctionDeclaration": reportDeclaration,
      "VariableDeclarator[id.type='Identifier'][init.type='FunctionExpression']": (node) => reportExpression(node, node.init),
    };
  },
};

export const localRules = {
  rules: {
    "comment-marker": commentMarker,
    "literal-dispatch": literalDispatch,
    "class-matches-file": classMatchesFile,
    "describe-target": describeTarget,
    "comment-placement": commentPlacement,
    "map-name": mapName,
    "known-keys": knownKeys,
    "no-bare-string-field": noBareStringField,
    "schema-file": schemaFile,
    "protocol-types-only": protocolTypesOnly,
    "interface-for-contracts": interfaceForContracts,
    "no-inferred-type": noInferredType,
    "error-location": errorLocation,
    "operation-name": operationName,
    "operation-port": operationPort,
    "no-fixed-wait": noFixedWait,
    "verb-function-name": verbFunctionName,
    "arrow-function": arrowFunction,
  },
};

export default { meta: { name: "local" }, rules: localRules.rules };
