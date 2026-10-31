# Adding an operation

This page is the contract a new operation must meet. In order:

1. Find the CapRover SDK method (or methods) the operation wraps. Every public method of the SDK is classified in `src/Adapters/CapRover/sdk-coverage.json` as an operation, planned, excluded or internal; `pnpm sdk:drift` fails on a method that is none of these. Change the method's entry to `operation` and name the operation.
2. Create `src/Operations/<Name>Operation.ts` with `static readonly NAME = "<name>"`, `implements OperationPort<Input>` and the members `description`, `inputSchema`, `risk` and `execute`. Its constructor takes the services it needs. If the CapRover client lacks the call, add it to `CaproverClientPort` and to the adapter in `src/Adapters/CapRover/`; the adapter parses the answer with a schema from `src/Schemas/CaproverResponseSchema.ts`.
3. Write its input type in `src/Protocols/AppInputProtocol.ts` (or a new `<Name>Protocol.ts`) and its schema in the matching Schema file, strict and with every field described (`docs/mcp-standards.md`).
4. Pick its risk tier. A write puts `DryRunFieldSchema` in its schema and implements `describeChange(input)`, which reads what it needs and returns what would change, without a write call. A destructive operation also takes the `user_confirmed` and `confirmation_token` fields. A critical one is unlocked only by `CAPROVER_MCP_ALLOW_CRITICAL=1`. `OperationRunnerService` does the rest: the mode, `dry_run`, the token and the masking of the password.
5. Write the description in the order `docs/mcp-standards.md` gives, and add a guide topic when the input needs a syntax.
6. Register it in `src/Operations/OperationManifest.ts`. The surfaces and the policy read the manifest; they need no other change. Add its name and tier to the list in `OperationManifest.test.ts`.
7. Tests: the operation through `ServerBuilder.test.ts` with `FakeCaproverClientAdapter`, a fake secret on every output path, the mode snapshot (the lists of tools per mode), and a case in the adapter test against a fixture. A call that needs a real CapRover goes in `scripts/caprover.integration.test.mjs`. The parity case through the `code` surface arrives with that surface.
8. Run it in a task that needs several calls and read the transcript.
