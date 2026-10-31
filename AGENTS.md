# better-caprover-mcp

An unofficial MCP server for CapRover. It lets an agent (Claude, Cursor, Codex) operate a CapRover server, with setup in one command (`npx` or Docker) and safety by default: it starts read-only. Vocabulary is in `GLOSSARY.md`; decisions are in `docs/adr/`; planned work is in GitHub issues.

Today the server exposes 14 operations on the `tools` surface (`src/Operations/OperationManifest.ts`). The `code` surface and the rest of the CapRover API are planned work; the docs below describe the rules they follow.

## Layout

Folders are created when the first file needs them.

- `src/Errors/`: error classes.
- `src/Protocols/`: `<Name>Protocol.ts` files, types only.
- `src/Schemas/`: `<Name>Schema.ts` files with the Zod schemas.
- `src/Utils/`: static helper classes (environment, logging, redaction).
- `src/Services/`: business rules (modes, policy, confirmation), dependencies through the constructor.
- `src/Adapters/<Vendor>/`: one external service each (`CapRover/`, `Sandbox/`).
- `src/Operations/`: one class per CapRover operation, names in English; each implements `OperationPort`.
- `src/Surfaces/`: the `tools` and `code` surfaces that expose the operations over MCP.
- `src/Server/`: the server builder and the transports; `src/main.ts` is the entry point.
- `scripts/`: the harness (lint, checks, package smoke test, SDK drift check) and the integration tests.
- Tests sit next to the file they test (`*.test.ts`, `*.test.mjs`).

## Commands

    nvm use
    pnpm ensure-deps   # runs pnpm install when node_modules is missing or package.json / pnpm-lock.yaml changed since the last install (also at the start of pnpm check and pnpm check:changed)
    pnpm test
    pnpm test:integration # tests that need a real CapRover (CI starts one); run pnpm build first
    pnpm sdk:drift     # fails when a CapRover SDK method is not classified in src/Adapters/CapRover/sdk-coverage.json
    pnpm test:changed  # tests related to files changed against origin/main
    pnpm typecheck
    pnpm lint          # Oxlint and a minimal ESLint, in parallel
    pnpm lint:fix      # same, applying the autofixable rules
    pnpm quality       # knip, dpdm, jscpd
    pnpm build         # bundles src/main.ts into dist/main.js
    pnpm smoke         # starts the built server and checks the initialize reply; `pnpm smoke -- <command>` checks another way to run it (npx, docker run -i)
    pnpm check:changed # only what the branch changed against origin/main (what the agent runs before a commit)
    pnpm check         # everything: typecheck, lint, quality, test, build and smoke (CI runs it, split in parallel jobs)

## How to act on a task

Read the doc for the situation; run the command when there is one. The index does not repeat those docs. What each command does is in **Commands** above.

| When | Read | Run |
| --- | --- | --- |
| Starting a session | `README.md` (Development) | `nvm use`, `pnpm ensure-deps` |
| Given a GitHub issue number | `docs/agents/issue-tracker.md` ("Working an issue") | `gh issue view <n> --comments` |
| Triage labels on an issue | `docs/agents/triage-labels.md` | — |
| Domain terms or an ADR for the area | `docs/agents/domain.md`, `GLOSSARY.md`, `docs/adr/` | — |
| Writing or changing code | `docs/code-standards.md` | — |
| Writing or changing tests | `docs/test-standards.md` | — |
| Iterating on changed source | `docs/test-standards.md`, `docs/code-standards.md` ("Before committing") | `pnpm test:changed` |
| Before committing | `docs/code-standards.md` ("Before committing"), `.github/PULL_REQUEST_TEMPLATE.md` | `pnpm check:changed` |
| Full verification (CI gate) | `.github/PULL_REQUEST_TEMPLATE.md` | `pnpm check` |
| Adding or changing an operation | `docs/mcp-standards.md`, `docs/product/adding-an-operation.md`, `docs/code-standards.md` ("Boundaries and security") | — |
| An operation or field description, the server instructions, a guide topic or an error message | `docs/prompt-standards.md`, `docs/mcp-standards.md` | `pnpm test` |
| Changing how the server talks to CapRover | `docs/test-standards.md` ("Which level") | `pnpm test:integration` |
| Packaging (npx, Docker) | `Dockerfile`, `scripts/package-smoke.mjs` | `pnpm build`, `pnpm smoke` |
| Releasing | `docs/product/releasing.md` | — |
| Writing or moving docs under `docs/` | `docs/docs-standards.md` | — |
| Changing the harness | `docs/harness-standards.md` | `pnpm check:changed` |

## Rules

- Commit once per task, after a clean `pnpm check:changed`; CI runs the full `pnpm check` as the gate. Never raise a limit or add an ignore to pass.
- Start new work on a branch from `main` and open a pull request; `.github/PULL_REQUEST_TEMPLATE.md` has the checklist.
- Branch names are `<type>/<short-name>` in lowercase kebab-case, where `<type>` is `feat` (new behavior), `fix` (bug fix) or `chore` (anything else: docs, refactor, tooling, dependencies). For issue work the name starts with the issue number: `feat/<n>-short-slug`.
- The pull request body starts with `Closes #<n>`; one pull request closes one issue. If the scope changed while working, update the issue body to match.
- Code, operations, parameters and docs are in English.
- Rules that cannot fail (access modes, risk tiers, confirmation, secret masking) live in code with a test, never only in a description or a prompt.
- The password, the token and the value of an environment variable are never returned or logged. Every new output path is redacted and tested with a fake secret.
- `process.env` is read only in `EnvUtil`. `process.stdout` belongs to the MCP protocol: nothing in `src/` writes to it, and logs go to stderr through `LogUtil`.
- Nothing in `src/` runs a command on the host: no `child_process`. The only network exit is the configured `CAPROVER_URL`.
- Each vendor SDK is imported in one place (`docs/code-standards.md`, "Architecture").
- The server starts in `readonly` mode; a mode is never raised by default.
- When behavior or vocabulary changes, update `GLOSSARY.md`, the docs or an ADR in the same PR.
