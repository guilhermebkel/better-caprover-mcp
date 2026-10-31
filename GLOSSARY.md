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
The single list of operations, `src/Operations/OperationManifest.ts`. The surfaces read it. The SDK drift check reads `src/Adapters/CapRover/sdk-coverage.json`, which says for every SDK method if it is an operation, planned, excluded or internal.
_Avoid_: catalog, registry

**Surface**:
A way of exposing the operations over MCP. The `tools` surface exposes named tools; the `code` surface exposes two tools, `search` and `execute`. Only `tools` exists today; `code` is *planned*.
_Avoid_: mode (that means the access mode), interface

**Toolset**:
A group of operations the `tools` surface turns on together, such as `apps` or `domains`. *Planned.*
_Avoid_: category, bundle

**Password**:
The one credential of a CapRover server, with at most 29 characters. There is no user name and no two-factor code (`docs/adr/0010-the-server-logs-in-with-the-password-only.md`).
_Avoid_: login, account, user

**Access mode**:
How much the server may do: `readonly` (the default), `operate` or `admin`. The mode decides which risk tiers are registered at all.
_Avoid_: permission level, role

**Risk tier**:
What an operation can do to the server: `read`, `write`, `destructive` or `critical`. A critical operation needs `admin` and `CAPROVER_MCP_ALLOW_CRITICAL=1`. No operation is critical yet.
_Avoid_: severity, level

**Policy**:
The rule of which risk tiers a mode allows, kept in `PolicyService`. `OperationRunnerService` applies it to every call, together with `dry_run`, the confirmation of destructive calls and the masking of secrets.
_Avoid_: guard, middleware

**Confirmation token**:
The code that a destructive operation returns with its preview. It is tied to that exact call (the operation and its inputs), works once and expires after 5 minutes. The server keeps it in memory, so a restart cancels it.
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
