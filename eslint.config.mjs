import vitest from "@vitest/eslint-plugin";
import globals from "globals";
import tseslint from "typescript-eslint";

// Why: Oxlint (`.oxlintrc.json`) runs every other rule; this config holds only what Oxlint cannot run or runs differently (docs/adr/0009-oxlint-with-a-minimal-eslint.md).
const BOOLEAN_PREFIXES = ["is", "has", "should", "can", "must", "was", "did"];
const TEST_FILES = ["src/**/*.test.ts", "scripts/**/*.test.mjs", "*.test.mjs"];

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "coverage/", "lint-fixtures-*/"] },
  {
    files: ["**/*.{ts,mjs,js}"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Why: Oxlint has no `no-useless-assignment` (nursery) and no `no-undef`; TypeScript files get theirs from `tsc`.
      "no-useless-assignment": "error",
      // Why: Oxlint reads these as syntax errors in strict mode, which ES modules always are; kept so no rule is dropped.
      "no-octal": "error",
      "no-dupe-args": "error",
      // Why: Oxlint's `id-length` also flags generic type parameters (`K extends ...`), which this repo allows.
      "id-length": ["error", { min: 2, exceptionPatterns: ["^_$"], properties: "never" }],
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"], leadingUnderscore: "allow" },
        { selector: "import", format: ["camelCase", "PascalCase"] },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "variable", modifiers: ["const", "global"], format: ["UPPER_CASE", "camelCase"] },
        // Why: a schema is named after what it describes, in PascalCase with the Schema suffix (ChatRequestSchema), like the type it is checked against.
        { selector: ["variable", "classProperty"], modifiers: ["const"], format: ["PascalCase"], filter: { regex: "^(?!appSchema$).*Schema$", match: true } },
        // Why: a function that builds a schema (`buildSkillNameSchema(names)`) keeps its camelCase name; only the schema constants are PascalCase.
        { selector: "variable", modifiers: ["const"], types: ["function"], format: ["camelCase"], filter: { regex: "Schema$", match: true } },
        { selector: "variable", modifiers: ["const", "global"], types: ["boolean", "number", "string", "array"], format: ["UPPER_CASE"] },
        { selector: ["variable", "parameter"], types: ["boolean"], format: ["PascalCase"], prefix: BOOLEAN_PREFIXES },
        // Why: object literal keys are checked through the type they satisfy; library option objects (`{ recursive: true }`) keep the library's names.
        { selector: ["typeProperty", "classProperty", "parameterProperty", "accessor"], types: ["boolean"], format: ["PascalCase"], prefix: BOOLEAN_PREFIXES },
        // Why: keys of external formats (agent JSON, CLI flags, snake_case signal ids) keep their spelling.
        { selector: ["objectLiteralProperty", "objectLiteralMethod", "typeProperty"], modifiers: ["requiresQuotes"], format: null },
        { selector: ["objectLiteralProperty", "objectLiteralMethod", "typeProperty"], format: null, filter: { regex: "^[a-z]+(_[a-z]+)+$", match: true } },
        // Why: `retry` (client request body) and `ok` (tool failure result) are wire-format names the client and the model already read.
        { selector: "typeProperty", types: ["boolean"], format: null, filter: { regex: "^(ok|retry|multiple|required|isRequired)$", match: true } },
        // Why: environment variable names keep the operating system's UPPER_CASE spelling.
        { selector: ["objectLiteralProperty", "typeProperty"], format: null, filter: { regex: "^[A-Z][A-Z0-9_]+$", match: true } },
        { selector: "classProperty", modifiers: ["static", "readonly"], format: ["UPPER_CASE", "camelCase"] },
        // Why: a static constant of a primitive type is spelled like a module-level one.
        { selector: "classProperty", modifiers: ["static", "readonly"], types: ["boolean", "number", "string", "array"], format: ["UPPER_CASE"] },
        // Why: esbuild's `define` injects these build-time constants.
        { selector: ["objectLiteralProperty"], format: null, filter: { regex: "^__[A-Z_]+__$", match: true } },
        { selector: "variable", format: null, filter: { regex: "^__[A-Z_]+__$", match: true } },
      ],
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "no-restricted-syntax": ["error", {
        selector: [
          "CallExpression > CallExpression.arguments:matches([arguments.length>=3], :has(> CallExpression.arguments))",
          "CallExpression > SpreadElement > CallExpression:matches([arguments.length>=3], :has(> CallExpression.arguments))",
        ].join(", "),
        message: "Store this call's result in a named variable before passing it to another call.",
      }],
    },
  },
  {
    files: [...TEST_FILES, "src/**/*Builder.ts", "src/**/fixtures/**"],
    rules: {
      // Why: fixtures write external formats (settings.json, env blocks) with their own key spelling.
      "@typescript-eslint/naming-convention": "off",
    },
  },
  {
    files: TEST_FILES,
    plugins: { vitest },
    rules: {
      // Why: Oxlint's version also flags `??` inside a test, which the vitest plugin allows (docs/adr/0009).
      "vitest/no-conditional-in-test": "error",
    },
  },
  {
    files: ["**/*.mjs", "**/*.js"],
    ...tseslint.configs.disableTypeChecked,
    rules: { ...tseslint.configs.disableTypeChecked.rules, "no-undef": "error" },
  },
);
