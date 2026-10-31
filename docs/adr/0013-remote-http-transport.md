# Remote Streamable HTTP transport (one CapRover server per instance)

Phase 5 lets a client reach the MCP server over the network. Stdio on the same machine stays the default; HTTP is opt-in via `serve --http`. Each MCP process talks to **exactly one** CapRover server via `CAPROVER_URL` and `CAPROVER_PASSWORD` (and `CAPROVER_MCP_MODE`), same as before Phase 5.

## Decision

- Use the MCP **Streamable HTTP** transport (`StreamableHTTPServerTransport` from the official SDK) on path `/mcp`. Start it with `better-caprover-mcp serve --http`; running with no arguments keeps **stdio** unchanged.
- Bind address and port from `CAPROVER_MCP_HTTP_HOST` and `CAPROVER_MCP_HTTP_PORT` (defaults in the README **Configuration** table). A separate **GET `/health`** returns `200` with body `ok` for Docker and reverse proxies (no MCP traffic).
- Each HTTP request must send `Authorization: Bearer <token>`. The secret is **`CAPROVER_MCP_HTTP_TOKEN`** (one value). `HttpAuthService` compares the bearer value to that secret using **SHA-256 digests and `timingSafeEqual`**. Failed auth returns **401** with body `Unauthorized`. **Non-local bind** refuses to start unless `CAPROVER_MCP_HTTP_TOKEN` is set and non-empty.
- One JSON audit line per tool call on stderr: `level: "audit"`, ISO time, `tool`, `risk`, `result` (`ok` | `denied` | `error`). No argument values or secrets. Tools the mode does not allow are not registered, so a client cannot normally call them; `denied` is written only if a call reaches the runner anyway (the policy check there is the second line of defense).
- HTTP limits: body size via `CAPROVER_MCP_MAX_HTTP_BODY_BYTES`; invalid JSON → **400**; rate limit via `CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE` — one shared **failed-auth** bucket and one shared **authenticated** bucket per process (separate counters, same limit value) → **429**; max concurrent in-flight tool executions via `CAPROVER_MCP_MAX_CONCURRENT` with a 30s FIFO wait → clear error. Numeric defaults and caps are in the README **Configuration** table.
- Streamable HTTP runs in **stateful session mode**: one shared `SharedMcpRuntimeBuilder` (one CapRover client, one policy, concurrency limiter, confirmation store) serves all sessions. Each `initialize` creates a transport and `McpServer` instance keyed by `Mcp-Session-Id`; sessions require a valid bearer on every request, expire after TTL, and are capped in count. Unknown session ids return **404** with body `Not Found`. Session cap exhaustion returns **503** with body `Service Unavailable`.
- Docker image: `HEALTHCHECK` runs `better-caprover-mcp health`. When HTTP mode is active the process writes a marker file; the command then requires `GET /health` on the configured port to return body `ok`, or it exits non-zero. With no marker (stdio-only), it exits success so a default `docker run -i` is never reported unhealthy.

## Threats

- **Stolen bearer token:** An attacker with the valid token can run any tool this instance allows on its CapRover server. Mitigation: long random token, TLS at the proxy, non-local bind refused without `CAPROVER_MCP_HTTP_TOKEN`, rate limits, audit lines without secrets. **Cost of a single token:** see *Single-token trade-offs* under Consequences.
- **Token brute force and auth flooding:** Repeated wrong tokens or missing auth must not enumerate valid secrets or exhaust CapRover. Mitigation: constant-time comparison, plain **401** with no reason, failed-auth rate limit in its **own** bucket so brute-force attempts cannot consume the authenticated bucket (valid tokens still work when failed-auth is full).
- **Session fixation and reuse without auth:** A session id must not be usable without a valid bearer on each request. Mitigation: auth runs before session handling; wrong or missing bearer → **401** (session id ignored).
- **Session exhaustion:** Opening unbounded MCP sessions could exhaust memory. Mitigation: max session count with **503** when full; a session expires after `CAPROVER_MCP_HTTP_SESSION_TTL_MS` without a request (every authenticated request renews it); expired sessions are dropped on the next request.
- **Oversized or malformed HTTP bodies:** Large POST bodies or bad JSON could waste CPU or memory. Mitigation: body size cap (**413**), invalid JSON → **400**.
- **CapRover overload:** Many parallel tool calls could flood the Captain API. Mitigation: concurrency limit with FIFO wait then a clear error.
- **Secret leakage:** Passwords, tokens, and env values must not appear in tool replies, errors, or logs. Mitigation: redaction on every output path; audit omits argument values; tests plant fake secrets on every path.
- **False healthy container in HTTP mode:** A process that bound HTTP but stopped answering `/health` should fail Docker health checks. Mitigation: HTTP mode marker + `better-caprover-mcp health`, which requires `ok` when the marker exists.

## Considered options

- **Several CapRover servers in one MCP process** (issue **#6** scope item **S1** and related multi-server config): rejected by the owner. One instance per CapRover server keeps configuration, policy, audit, and confirmation tokens simple; operators run multiple MCP processes (stdio or HTTP) when they need more than one Captain.
- Issue **#6** scope item **S1** gave a per-client bearer token as the starting proposal (`CAPROVER_MCP_HTTP_TOKENS`, a JSON map of name to secret). The owner chose a single **`CAPROVER_MCP_HTTP_TOKEN`** instead. **Named client tokens** (`CAPROVER_MCP_HTTP_TOKENS`): rejected; **one shared HTTP token** (`CAPROVER_MCP_HTTP_TOKEN`): accepted.
- **Per-IP failed-auth keys:** rejected; behind the recommended proxy all callers often share one remote address, and a per-key map can grow without bound.
- **SSE-only legacy transport**: rejected; Streamable HTTP is the MCP direction.
- **New `McpServer` + registry per HTTP session**: rejected; it duplicated concurrency limits and CapRover clients per session.
- **Defer HTTP until after first release**: rejected; opt-in keeps default risk low.

## Consequences

- **Single-token trade-offs:** no per-client revocation without rotating the secret for everyone; stderr audit lines name tool and risk only, not which HTTP client connected; authenticated MCP requests share one rate-limit bucket process-wide.
- A token guesser can exhaust the shared failed-auth bucket for up to a minute; callers sending wrong or missing bearer tokens then receive **429** until the window resets (authenticated traffic uses a separate bucket).
- `EnvUtil` and `CaproverClientAdapter.buildFromEnv` configure the single CapRover connection; `SharedMcpRuntimeBuilder` wires client, policy, concurrency, confirmation, and redaction secrets.
- `OperationRunnerService` applies policy, audit, concurrency, confirmation, and redaction for every tool call.
- Docker image `HEALTHCHECK` uses the configured HTTP port (see README **Configuration**). Terminate TLS at a reverse proxy for network exposure.
- Issue **#6** multi-server scope is **out of scope** by owner decision; use one MCP instance per CapRover server instead.
- Phase 2 (#3) stable manifest was not complete when this was decided; the work uses the existing 14-operation manifest and proceeded on the owner's request.

## Related

- ADR 0005 (safety in code), ADR 0010 (password only), ADR 0011 (confirmation token). ADR 0006 covers the QuickJS sandbox for the planned `code` surface, not this HTTP transport.

Moved by ADR 0014: `SharedMcpRuntimeBuilder` is now `src/Surfaces/SharedMcpRuntimeSurface.ts` and the runners are in `src/Setup/`.
