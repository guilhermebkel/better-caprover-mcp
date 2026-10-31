# An operation description may name a neighbor operation

The standards of the project this harness comes from forbid a tool description to name another tool, because there the order of calls belongs to a skill and the system prompt. This server has neither: a client connects to it with no prompt of ours. So a description may name a neighbor operation in two cases, and no other.

## Decision

- To route: "to list apps, use `list_apps`".
- To say where a value comes from: "an app name as returned by `list_apps`".
- The order of a flow never goes in a description. It goes in the server `instructions`, once.

## Consequences

- `docs/prompt-standards.md` and `docs/mcp-standards.md` carry this rule; the asset test checks that every operation named in a description exists.
- This follows the design notes the author wrote about mature MCP servers, where a field description names the operation that produces its value.
