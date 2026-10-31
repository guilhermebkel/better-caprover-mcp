# Remote Streamable HTTP transport and several CapRover servers

Phase 5 lets a client reach the MCP server over the network and target more than one CapRover server from one process. Stdio on the same machine stays the default; HTTP is opt-in via `serve --http`.

## Decision

- Use the MCP **Streamable HTTP** transport (`StreamableHTTPServerTransport` from the official SDK) on path `/mcp`. Start it with `better-caprover-mcp serve --http`; running with no arguments keeps **stdio** unchanged.
- Bind to `127.0.0.1` by default (`CAPROVER_MCP_HTTP_HOST`). Port defaults to `3100` (`CAPROVER_MCP_HTTP_PORT`). A separate **GET `/health`** returns `200` with body `ok` for Docker and reverse proxies (no MCP traffic).
- Each HTTP request must send `Authorization: Bearer <token>`. Tokens are a **JSON object of named clients** in `CAPROVER_MCP_HTTP_TOKENS`. `HttpAuthService` compares the bearer value to every configured secret using **SHA-256 digests and `timingSafeEqual`**. Failed auth returns **401** with body `Unauthorized`. **Non-local bind** refuses to start unless `CAPROVER_MCP_HTTP_TOKENS` is set and non-empty.
- **Multi-server configuration:** `CAPROVER_MCP_SERVERS` (JSON) or `CAPROVER_MCP_SERVERS_FILE`. Legacy single-server setup (`CAPROVER_URL` / `CAPROVER_PASSWORD` only) keeps one implicit server named `default`; `server_name` stays optional. With **two or more** servers, every tool call requires `server_name`. Each entry has `name`, `url`, `mode`, optional `isCriticalAllowed` (default false), and **either** `passwordEnv` **or** `passwordFile` (no inline passwords).
- Per-server mode is enforced by a dedicated `PolicyService` per server. Tools on the MCP surface are the **union** of tiers any server allows; each call is checked against that server's mode.
- Optional `server_name` on every tool input (shared control fields). `get_overview` includes a `servers` array with `name`, `accessMode`, and `enabledRiskTiers` only—no URLs.
- One JSON audit line per tool call on stderr: `level: "audit"`, ISO time, `tool`, `server`, `risk`, `result` (`ok` | `denied` | `error`). No argument values or secrets.
- HTTP limits: max body 1 MiB (`CAPROVER_MCP_MAX_HTTP_BODY_BYTES`); invalid JSON → **400**; rate limit `CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE` per bearer (including failed auth) → **429**; max concurrent in-flight tool executions per CapRover server name (`CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER`, default 5) with a 30s FIFO wait → clear error with the **real server name**.
- Streamable HTTP runs in **stateful session mode**: one shared `McpApplicationService` (registry, concurrency limiter, CapRover clients) serves all sessions. Each `initialize` creates a transport and `McpServer` instance keyed by `Mcp-Session-Id`; sessions are tied to the bearer token that created them, expire after TTL, and are capped in count. Unknown or wrong-token session headers return **404** or **401** as appropriate.
- Docker image: `HEALTHCHECK` calls `scripts/docker-healthcheck.sh`, which succeeds when `/health` returns `ok` or when nothing is listening (stdio-only). HTTP deployments should run `serve --http` so `/health` answers.

## Considered options

- **One shared HTTP token** instead of named tokens: rejected for rotation granularity.
- **Passwords inline in the servers file**: rejected; env var or file reference only.
- **SSE-only legacy transport**: rejected; Streamable HTTP is the MCP direction.
- **New `McpServer` + registry per HTTP session**: rejected; it duplicated concurrency limits and CapRover clients per session.
- **Defer HTTP until after first release**: rejected; opt-in keeps default risk low.

## Consequences

- `EnvUtil`, `CaproverServerEnvUtil`, and `CaproverServerRegistryService` centralize configuration, resolution, and secrets collection.
- Operations keep a single `CaproverClientPort` in the manifest via `RoutingCaproverClientAdapter` and `AsyncLocalStorage` for the active server.
- `OperationRunnerService` resolves `server_name`, applies per-server policy, audit, concurrency, and redaction with all configured secrets.
- Docker exposes `3100`. Terminate TLS at a reverse proxy for network exposure.
- Phase 2 (#3) stable manifest is not complete on `main`; this work uses the existing 14-operation manifest.

## Related

- ADR 0005 (safety in code), ADR 0006 (remote deployment option), ADR 0010 (password only), ADR 0011 (confirmation token)
