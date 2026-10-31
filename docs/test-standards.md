# Test standards

How tests in this repository are written. `pnpm lint` enforces the rules marked **(lint)**, through Oxlint's Vitest rules (and `@vitest/eslint-plugin` for `no-conditional-in-test`) and the rules in `docs/code-standards.md`, which apply to tests too; the rest are checked in review. Every rule here serves one of two questions: would this test fail if the code broke, and is it testing the real code?

## Where tests live

- **Next to the code.** A test lives beside the file it tests and shares its name (e.g. `EnvUtil.ts` → `EnvUtil.test.ts`; `check-changed.mjs` → `check-changed.test.mjs`). There is no `test/` folder. Every test runs in Node.
- **The outer describe names what is tested (lint).** Every test in `src/` sits under a top-level `describe("ClassName.method()")`: the class the file tests and the public method the tests go through. Situations go in describes inside it, worded as a context (`describe("when the mode is set")`). Lint (`local/describe-target`) checks that the class is the file's and that the method exists and is public, so renaming a method without its tests fails. A private method is tested through the public one that calls it.
- **Through the highest seam.** Test behavior through operations, surfaces and the server (a real MCP client over `InMemoryTransport`). Test a lower module directly only for logic with many cases (modes, redaction, masking).
- **Fixtures in the real format.** Fixtures for the CapRover API are complete responses in the real format, kept in `src/Testing/fixtures/`. Test doubles (the fake client, the mock CapRover server) live in `src/Testing/`, which production code never imports. A file named `recorded*` was recorded from a real CapRover (1.15.5); the others were written from the CapRover source. Prefer recording: the first run against a real server found three differences from the source (a missing field, a binary log format and a missing endpoint).
- **Every new behavior brings its test.** Each new operation, output path or rule gets a test, with a fake secret where output is involved.

## Which level

Many fast low-level tests, few slow ones. Pick the lowest level that can fail for the behavior you are adding. The level is your choice as the agent that does the work, not the issue's: an issue says what to prove, never which kind of test.

- **Unit and service tests** for utils, schemas, services and operations (with a double for the CapRover client).
- **Server tests** for what a client sees: a real MCP client talks to the built server object in memory.
- **Package smoke** (`pnpm smoke`) for the built bundle: it starts the server through `node`, `npx`, and `docker run -i` (stdio `initialize`), and through `serve --http` for Streamable HTTP. CI runs both stdio and HTTP smoke for `npx` and Docker.
- **Integration** against a real CapRover in Docker (`pnpm test:integration`, files `scripts/*.integration.test.mjs`), for what a double cannot prove: login, deploy, logs, and the built bundle talking to CapRover over stdio. `pnpm test` leaves these out. They need `pnpm build` first and a CapRover with its default password, or `CAPROVER_TEST_URL` and `CAPROVER_TEST_PASSWORD`. `scripts/start-caprover.sh` starts one in Docker, locally and in CI.

A bug found at a high level (smoke, integration, a user report) is first reproduced in a lower-level test, then fixed.

## What a test checks

- **Name the break.** Before writing the body, name the change to the code that should make the test fail. If you can't name one, the test checks nothing. A test that fails only when a constant or a message changes is a change detector: test the behavior that depends on it instead.
- **Expected values come from outside the code.** Write them as literals worked out by hand from the fixture, never computed with the code under test or its constants. Arithmetic that shows the derivation is fine.
- **Exact assertions (lint).** `toStrictEqual`, not `toEqual`. No `toBeDefined`, `toBeTruthy` or `toBeFalsy`. `toThrow` names the message; calls are checked with their arguments.
- **No vacuous passes.** An assertion that something never appears passes on empty output too: first assert there was something to check.
- **One behavior per test, named by the behavior,** in the domain's words (`GLOSSARY.md`): "refuses a delete in readonly mode", "keeps the mode when the variable is missing".

## Test code stays simple

- **No logic in the test body (lint).** No `if` or `try` deciding which assertion runs. Cases that differ only in data are rows of `it.each`.
- **Same rules as the code (lint).** Complexity, nesting, parameters, nested calls and duplication apply to tests. Exemptions: magic numbers, external key spelling, `!` and `process.env`.
- **Builders, with what matters spelled out.** Build input with builders, and set every value the assertion depends on in the test itself.
- **Wait for the condition, never for time (lint).** `local/no-fixed-wait` rejects `waitForTimeout` and `setTimeout` in tests. Use `expect.poll`, `vi.waitFor` or a fake timer.
- **Clean structure (lint).** No skipped, focused, commented-out or duplicated tests; hooks at the top of their block.

## Real code, doubles only at the edges

- **Run the real thing.** Real services, real schemas. Don't mock this repository's own modules: if a test needs that, the seam is wrong.
- **Doubles only where the process meets the outside:** the CapRover HTTP API (recorded fixtures), the clock, the host functions the sandbox calls. Assert what the code did with them.
- **Time is an input.** Pass timestamps in; tests never depend on the clock.
- **Production code has no test-only methods.**

## Safety tests

Behavior that cannot fail has a deterministic test and no exception: every output path returns no secret (a fake one is planted and searched for); the `readonly` mode registers no write operation (a snapshot per mode); a script in the sandbox cannot reach the network, the files or the host. A change to one of these rules changes its test in the same PR.

## Before finishing: the mutation check

Go through the code you changed and imagine the realistic mistakes: a wrong threshold, the wrong branch, a missing redaction, a mode that lets a write through, an empty result, an off-by-one, something counted twice. Some test should fail for each. When none would, add or fix the test before committing.
