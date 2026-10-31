# Adding an operation

The port, the manifest and the first operation arrive together in one pull request; this page is the contract they must meet. In order:

1. Find the CapRover SDK method (or methods) the operation wraps. Every public method of the SDK is either an operation or in the list of exclusions; `pnpm sdk:drift` (planned) fails on a method that is neither.
2. Create `src/Operations/<Name>Operation.ts` with `static readonly NAME = "<name>"`, `implements OperationPort<Input>` and the members `description`, `inputSchema`, `risk` and `execute`. Its constructor takes the services it needs.
3. Write its schema in `src/Schemas/<Name>Schema.ts` and its types in `src/Protocols/<Name>Protocol.ts`, strict and with every field described (`docs/mcp-standards.md`).
4. Pick its risk tier. A write has `dry_run`; a destructive operation has `user_confirmed`; a critical one is unlocked only by `CAPROVER_MCP_ALLOW_CRITICAL=1`.
5. Write the description in the order `docs/mcp-standards.md` gives, and add a guide topic when the input needs a syntax.
6. Register it in the manifest. The surfaces and the policy read the manifest; they need no other change.
7. Tests: the operation with a double for the CapRover client, a fake secret on every output path, the mode snapshot, and the parity case through both surfaces.
8. Run it in a task that needs several calls and read the transcript.
