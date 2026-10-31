# Remote Streamable HTTP transport and several CapRover servers

Phase 5 lets a client reach the MCP server over the network and target more than one CapRover server from one process. Stdio on the same machine stays the default; HTTP is opt-in via `serve --http`.

## Decision

- Use the MCP **Streamable HTTP** transport (`StreamableHTTPServerTransport` from the official SDK) on path `/mcp`. Start it with `better-caprover-mcp serve --http`; running with no arguments keeps **stdio** unchanged.
- Bind to `127.0.0.1` by default (`CAPROVER_MCP_HTTP_HOST`). Port defaults to `3100` (`CAPROVER_MCP_HTTP_PORT`). A separate **GET `/health`** returns `200` with body `ok` for Docker and reverse proxies (no MCP traffic).
- Each HTTP request must send `Authorization: Bearer <token>`. The secret is **`CAPROVER_MCP_HTTP_TOKEN`** (one value). `HttpAuthService` compares the bearer value to that secret using **SHA-256 digests and `timingSafeEqual`**. Failed auth returns **401** with body `Unauthorized`. **Non-local bind** refuses to start unless `CAPROVER_MCP_HTTP_TOKEN` is set and non-empty.
- **Multi-server configuration:** `CAPROVER_MCP_SERVERS` (JSON) or `CAPROVER_MCP_SERVERS_FILE`. Legacy single-server setup (`CAPROVER_URL` / `CAPROVER_PASSWORD` only) keeps one implicit server named `default`; `server_name` stays optional. With **two or more** servers, every tool call requires `server_name`. Each entry has `name`, `url`, `mode`, optional `isCriticalAllowed` (default false), and **either** `passwordEnv` **or** `passwordFile` (no inline passwords).
- Per-server mode is enforced by a dedicated `PolicyService` per server. Tools on the MCP surface are the **union** of tiers any server allows; each call is checked against that server's mode.
- Optional `server_name` on every tool input (shared control fields). `get_overview` includes a `servers` array with `name`, `accessMode`, and `enabledRiskTiers` only—no URLs.
- One JSON audit line per tool call on stderr: `level: "audit"`, ISO time, `tool`, `server`, `risk`, `result` (`ok` | `denied` | `error`). No argument values or secrets.
- HTTP limits: max body 1 MiB (`CAPROVER_MCP_MAX_HTTP_BODY_BYTES`); invalid JSON → **400**; rate limit `CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE` — failed auth keyed by **client remote address**, authenticated MCP traffic in **one shared bucket** (not per connection identity) → **429**; max concurrent in-flight tool executions per CapRover server name (`CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER`, default 5) with a 30s FIFO wait → clear error with the **real server name**.
- Streamable HTTP runs in **stateful session mode**: one shared `SharedMcpRuntimeBuilder` (registry, concurrency limiter, CapRover clients) serves all sessions. Each `initialize` creates a transport and `McpServer` instance keyed by `Mcp-Session-Id`; sessions require a valid bearer on every request, expire after TTL, and are capped in count. Unknown session ids return **404** with body `Not Found`. Session cap exhaustion returns **503** with body `Service Unavailable`.
- Docker image: `HEALTHCHECK` runs `scripts/docker-healthcheck.sh`. When HTTP mode is active the process writes a marker file; the script then requires `GET /health` to return body `ok` or the check fails. With no marker (stdio-only), the script exits success so default `docker run` without `serve --http` stays healthy.

## Threats

- **Stolen bearer token:** An attacker with the valid token can run any tool the configured CapRover servers allow. Mitigation: long random token, TLS at the proxy, non-local bind refused without `CAPROVER_MCP_HTTP_TOKEN`, rate limits, audit lines without secrets.
- **Token brute force and auth flooding:** Repeated wrong tokens or missing auth must not enumerate valid secrets or exhaust CapRover. Mitigation: constant-time comparison, plain **401** with no reason, failed-auth rate limit keyed by **remote address**, stale rate-limit windows pruned.
- **Session fixation and reuse without auth:** A session id must not be usable without a valid bearer on each request. Mitigation: auth runs before session handling; wrong or missing bearer → **401** (session id ignored).
- **Session exhaustion:** Opening unbounded MCP sessions could exhaust memory. Mitigation: max session count with **503** when full; TTL drops idle sessions.
- **Oversized or malformed HTTP bodies:** Large POST bodies or bad JSON could waste CPU or memory. Mitigation: body size cap (**413**), invalid JSON → **400**.
- **CapRover overload:** Many parallel tool calls against one server name could flood the Captain API. Mitigation: per-server concurrency limit with FIFO wait then a clear error naming the server.
- **Multi-server mis-targeting:** Calling the wrong CapRover server could change production instead of staging. Mitigation: require `server_name` when several servers are configured; unknown names list valid names only; overview lists names and modes without URLs.
- **Secret leakage:** Passwords, tokens, and env values must not appear in tool replies, errors, or logs. Mitigation: redaction on every output path; audit omits argument values; tests plant fake secrets on every path.
- **False healthy container in HTTP mode:** A process that bound HTTP but stopped answering `/health` should fail Docker health checks. Mitigation: HTTP mode marker + health script that requires `ok` when the marker exists.

## Considered options

- **Named client tokens (`CAPROVER_MCP_HTTP_TOKENS` JSON map):** rejected; one shared secret is enough for this server and keeps configuration and rate limits simple.
- **One shared HTTP token** (`CAPROVER_MCP_HTTP_TOKEN`): **accepted**.
- **Passwords inline in the servers file**: rejected; env var or file reference only.
- **SSE-only legacy transport**: rejected; Streamable HTTP is the MCP direction.
- **New `McpServer` + registry per HTTP session**: rejected; it duplicated concurrency limits and CapRover clients per session.
- **Defer HTTP until after first release**: rejected; opt-in keeps default risk low.

## Consequences

- `EnvUtil`, `CaproverServerEnvUtil`, and `CaproverServerRegistryService` centralize configuration, resolution, and secrets collection.
- Operations keep a single `CaproverClientPort` in the manifest via `RoutingCaproverClientAdapter` and `AsyncLocalStorage` for the active server.
- `OperationRunnerService` resolves `server_name`, applies per-server policy, audit, concurrency, and redaction with all configured secrets.
- Docker exposes `3100`. Terminate TLS at a reverse proxy for network exposure.
- Phase 2 (#3) stable manifest is not complete on `main`; this work uses the existing 14-operation manifest and proceeded on the owner's request.

## Related

- ADR 0005 (safety in code), ADR 0010 (password only), ADR 0011 (confirmation token). ADR 0006 covers the QuickJS sandbox for the planned `code` surface, not this HTTP transport.
