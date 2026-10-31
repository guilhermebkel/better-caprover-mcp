# Toolsets keep the tool list short

The manifest holds about 70 operations. A client that lists 70 tools pays for them in every turn, so the `tools` surface registers a subset.

## Decision

- Every operation belongs to one toolset: `core`, `apps`, `domains`, `projects`, `oneclick`, `registries`, `cluster`, `maintenance`, `monitoring` or `account`. The manifest says which (`OperationManifestSurface`), and `docs/product/risk-tiers.md` lists them.
- `CAPROVER_MCP_TOOLSETS` is a comma-separated list. The default is `core,apps,domains,oneclick`, which keeps every operation of the first release registered.
- An empty or missing value means the default. An unknown name stops the server at startup, naming the valid ones.
- A toolset narrows what the mode allows and never widens it: an operation is registered only when its toolset is on and its tier is allowed.
- `get_access` and the server instructions list the active toolsets, so a model that misses an operation can tell the person which toolset to turn on.

## Considered options

- Registering everything: rejected, for the cost in every turn.
- A smaller default (`core` only): rejected for now, because it would remove operations that people already use. The default is open to change by the maintainer.
- Choosing by tier alone: rejected. The tier says how risky a call is, not what it is for.

## Consequences

- A new operation names its toolset in the manifest, and the test of the manifest lists it.
- The `code` surface (Phase 4) is not affected: it exposes `search` and `execute`, whatever the toolsets are.
