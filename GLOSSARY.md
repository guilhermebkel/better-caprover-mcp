# better-caprover-mcp

An unofficial MCP server for CapRover.

Terms marked *planned* have no code yet; they are the vocabulary the docs already use.

## Language

**CapRover**:
The self-hosted platform that runs apps in Docker on one or more servers. This project is not affiliated with it.
_Avoid_: Captain (that is the name of its dashboard), the PaaS

**Operation**:
One thing the server can do on a CapRover server, such as listing apps or deploying an image. It has a name, a strict input schema, a risk tier and a description. One operation matches one method of the CapRover SDK, or a composite of several. Operations are in `src/Operations/`.
_Avoid_: tool (that is how a client sees an operation), endpoint, command

**Manifest**:
The single list of operations, `src/Surfaces/OperationManifestSurface.ts`. The surfaces read it. The SDK drift check reads `scripts/sdk-coverage.json`, which says for every SDK method if it is an operation, planned, excluded or internal.
_Avoid_: catalog, registry

**Surface**:
A way of exposing the operations over MCP. The `tools` surface exposes named tools; the `code` surface exposes two tools, `search` and `execute`. Only `tools` exists today; `code` is *planned*.
_Avoid_: mode (that means the access mode), interface

**Remote HTTP**:
An optional way to run the MCP server with Streamable HTTP (`better-caprover-mcp serve --http`) so a client on another host can connect. Each instance uses one CapRover server (`CAPROVER_URL` / `CAPROVER_PASSWORD`). Local stdio remains the default. `CAPROVER_MCP_TRANSPORT=http` selects HTTP without changing the command (for deployments that only set environment variables); `stdio` is the default. `CAPROVER_MCP_HTTP_TOKEN` protects non-local binds.
_Avoid_: SSE-only transport

**Toolset**:
A group of operations the `tools` surface turns on together, such as `apps` or `domains`. `CAPROVER_MCP_TOOLSETS` picks them; the default is `core,apps,domains,oneclick` so the tool list stays short. The list is in `docs/product/risk-tiers.md`.
_Avoid_: category, bundle

**Password**:
The one credential of a CapRover server, with at most 29 characters. There is no user name and no two-factor code (`docs/adr/0010-the-server-logs-in-with-the-password-only.md`).
_Avoid_: login, account, user

**Access mode**:
How much the server may do: `readonly` (the default), `operate` or `admin`. The mode decides which risk tiers are registered at all.
_Avoid_: permission level, role

**Risk tier**:
What an operation can do to the server: `read`, `write`, `destructive` or `critical`. A critical operation needs `admin` and `CAPROVER_MCP_ALLOW_CRITICAL=1`. Eight operations are critical: the ones that can lock the server out or break every app (`docs/product/risk-tiers.md`).
_Avoid_: severity, level

**Elicitation**:
The MCP feature by which the server asks the person a question through the client. When the client supports it, a destructive or critical call that holds a valid confirmation token still asks the person before it runs; a decline or a cancel stops it. When the client cannot ask, the token alone applies.
_Avoid_: prompt, popup

**Guide topic**:
A short document the server serves by name (`modes`, `code-mode`, `app-definition`, `env-vars`, `deploy`, `errors`) through the `get_guide` operation and as the resource `caprover://docs/<topic>`. An error that needs a topic names it.
_Avoid_: help page, manual

**Batch**:
An operation that applies one change to a list of items, one call per item, in order. It stops at the first failure and returns `applied` and `notApplied`. CapRover has no transactions, so the applied items stay applied and a batch is never called atomic.
_Avoid_: bulk, transaction

**Policy**:
The rule of which risk tiers a mode allows, kept in `PolicyService`. `OperationRunnerService` applies it to every call, together with `dry_run`, the confirmation of destructive calls and the masking of secrets.
_Avoid_: guard, middleware

**Confirmation token**:
The code that a destructive or critical operation returns with its preview. It is tied to that exact call (the operation and its inputs), works once and expires after 5 minutes. The server keeps it in memory, so a restart cancels it.
_Avoid_: nonce, approval code

**Code Mode**:
The pattern where the model writes a short script against a typed API and the server runs it, instead of calling one tool per step. This project offers it as the `code` surface. *Planned.*
_Avoid_: scripting, eval

**Sandbox**:
The QuickJS runtime in which the `code` surface runs the model's script: no network, no files, no modules, and only `caprover.*` to call. *Planned.*
_Avoid_: VM, container

**Dry run**:
A call that changes nothing and returns the plan: what the operation would do. Every write operation accepts it, and it makes no write call on CapRover.
_Avoid_: preview, simulate

**Confirmation**:
The step before a destructive operation runs: first call returns what would be lost and a code tied to that preview; the second call carries `user_confirmed` and the code. Asking the person directly through the client (elicitation) is *planned*.
_Avoid_: approval, ack
