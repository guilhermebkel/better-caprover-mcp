# Two surfaces: named tools and Code Mode

The same operations are exposed in two ways, chosen with `CAPROVER_MCP_SURFACE` (`tools`, `code` or `both`). The `tools` surface exposes named tools in toolsets. The `code` surface exposes two tools, `search` and `execute`: the model writes a short script against a typed API and the server runs it in a sandbox, as in Cloudflare's Code Mode.

## Considered options

- Only named tools: rejected as the whole answer. Covering the whole CapRover API (71 SDK methods) as tools costs context in every turn.
- Only Code Mode: rejected. For a handful of calls, direct tools are simpler to approve and cheaper to run, and a client approves a named action more easily than a block of code.

## Consequences

- A benchmark on three real tasks compares tokens, rounds and success for `tools` (core), `tools` (all toolsets) and `code`, and decides which one is the default.
- A call from a script passes through the same policy as a named tool, and a parity test runs the same cases through both.
- Planned: both surfaces arrive after the first operations.
