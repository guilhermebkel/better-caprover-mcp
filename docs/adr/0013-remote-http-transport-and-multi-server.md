# Remote Streamable HTTP transport and several CapRover servers

Phase 5 lets a client reach the MCP server over the network and target more than one CapRover server from one process. Stdio on the same machine stays the default; HTTP is opt-in via `serve --http`.

## Decisions

### Transport (S2)

- Use the MCP **Streamable HTTP** transport (`StreamableHTTPServerTransport` from the official SDK) on path `/mcp`.
- Start it with `better-caprover-mcp serve --http`. Running with no arguments keeps **stdio** unchanged.
- Bind to `127.0.0.1` by default (`CAPROVER_MCP_HTTP_HOST`). Port defaults to `3100` (`CAPROVER_MCP_HTTP_PORT`).
- A separate **GET `/health`** returns `200` with body `ok` for Docker and reverse proxies (no MCP traffic).

### Client authentication (S3, Needs input)

- Each HTTP request must send `Authorization: Bearer <token>`.
- Tokens are configured as a **JSON object of named clients** in `CAPROVER_MCP_HTTP_TOKENS`, for example `{"cursor":"<secret>","ci":"<other-secret>"}`. Names are for rotation and operations; the audit log does not record which token matched.
- `EnvUtil` reads the JSON; `HttpAuthService` compares the bearer value to every configured secret using **SHA-256 digests and `timingSafeEqual`**, always checking all entries so timing does not reveal how many tokens exist or which one matched.
- A failed check returns **401** with body `Unauthorized` and no hint about missing versus wrong token.
- **Non-local bind** (`CAPROVER_MCP_HTTP_HOST` not `127.0.0.1`, `::1`, or `localhost`) **refuses to start** unless `CAPROVER_MCP_HTTP_TOKENS` is set and non-empty (AC1).

OAuth and user accounts stay out of scope (issue out of scope).

### Multi-server configuration (S4–S6, Needs input)

- **Both** environment and file are supported:
  - `CAPROVER_MCP_SERVERS`: JSON array of server entries.
  - `CAPROVER_MCP_SERVERS_FILE`: path to a JSON file with the same array or `{ "servers": [ … ] }`.
- The **legacy single-server setup is unchanged**: when only `CAPROVER_URL` and `CAPROVER_PASSWORD` are set (and no multi-server list), one implicit server named `default` is used; the `server` tool parameter stays optional (AC8).
- When **two or more** servers are configured, every operation requires `server` with a configured name; omitting it or using an unknown name fails and lists valid names (AC3).
- Each entry: `name`, `url`, `mode` (`readonly` | `operate` | `admin`), optional `allowCritical` (boolean, default false), and **either** `passwordEnv` (name of an env var holding the password) **or** `passwordFile` (path to a file, trimmed; for Docker secrets). Inline passwords in the JSON file are rejected.
- Per-server mode is enforced by a dedicated `PolicyService` per server. Tools registered on the MCP surface are the **union** of tiers any server allows; a call is still denied if that server's mode blocks the tier (AC4).
- Passwords are loaded only through `EnvUtil` / `FileReadUtil`, never logged, returned, or echoed in errors (AC5).

### Server selection (S5)

- Optional `server` on every tool input (documented via shared control fields). Stripped before the operation schema runs so strict objects stay strict.
- `get_overview` includes a `servers` array with `name`, `accessMode`, and `enabledRiskTiers` only—**no URLs** that could identify a person. CapRover stats in the overview refer to the selected server.

### Audit log (S7)

- One JSON line per tool call on stderr: `level: "audit"`, ISO time, `tool`, `server`, `risk`, `result` (`ok` | `denied` | `error`). No argument values, passwords, or app content (AC6).

### HTTP limits (S9)

- Maximum request body size: 1 MiB (`CAPROVER_MCP_MAX_HTTP_BODY_BYTES`, default `1048576`).
- Maximum concurrent in-flight tool executions **per CapRover server name**: 5 (`CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER`). Extra calls wait; if the wait exceeds 30 seconds, the call fails with a clear message (AC7).

### Release timing (Needs input)

- Ship HTTP in this phase before the first package release. It remains **opt-in** (`serve --http`); stdio stays the default so local clients do not gain attack surface unless the operator enables HTTP.

## Threats considered

| Threat | Mitigation |
| --- | --- |
| Network exposure of MCP without auth | Default bind localhost; non-local bind requires tokens; 401 on bad/missing bearer |
| Token guessing / timing leaks | Constant-time comparison over hashed secrets; uniform 401 body |
| Password in logs, replies, or `ps` | Redaction on all outputs; passwords only from env or secret files; never in config JSON |
| One client flooding CapRover | Per-server concurrency cap; HTTP body size limit |
| Cross-server writes with wrong mode | Per-server `PolicyService` on every call |
| Token theft on the wire | Document TLS termination at a reverse proxy (README / product doc); no TLS inside the Node process in this phase |

## Considered options

- **One shared HTTP token** instead of named tokens: rejected for rotation and revocation granularity; named map adds little complexity.
- **Passwords inline in the servers file**: rejected; env var or file reference only (Docker secrets).
- **SSE-only legacy transport**: rejected; Streamable HTTP is the MCP direction and what the SDK documents.
- **Defer HTTP until after first release**: rejected per maintainer direction; opt-in keeps default risk low.

## Consequences

- `EnvUtil` and `EnvSchema` grow; `CaproverServerRegistryService` centralizes resolution and secrets collection.
- Operations keep a single `CaproverClientPort` in the manifest via `RoutingCaproverClientAdapter` and `AsyncLocalStorage` for the active server.
- `OperationRunnerService` resolves `server`, applies per-server policy, audit, and concurrency, and redacts with all configured secrets.
- Docker exposes `3100`, sets `HEALTHCHECK` on `/health`, and documents HTTP mode in README and `docs/product/remote-http.md`.
- Phase 2 (#3) stable manifest and toolsets are not complete on `main`; this work builds on the existing 14-operation manifest and notes that dependency in the pull request.

## Related

- ADR 0005 (safety in code), ADR 0006 (remote deployment option), ADR 0010 (password only), ADR 0011 (confirmation token)
