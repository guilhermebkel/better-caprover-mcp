# Remote HTTP mode

Run the MCP server so a client on another machine can connect over **Streamable HTTP**. Each MCP instance talks to **one** CapRover server (`CAPROVER_URL`, `CAPROVER_PASSWORD`, and `CAPROVER_MCP_MODE`). To manage several CapRover servers, run one MCP process per server.

## Start HTTP locally

```bash
export CAPROVER_URL=https://captain.example.com
export CAPROVER_PASSWORD='your password'
export CAPROVER_MCP_HTTP_TOKEN='choose-a-long-random-secret'
better-caprover-mcp serve --http
```

MCP traffic uses path **`/mcp`** on the configured bind address and port (defaults in the README [**Configuration**](../../README.md#configuration) table). **`GET /health`** on the same listener returns `ok` for Docker and proxies.

Clients must send `Authorization: Bearer <secret>` on every MCP request. The secret must match `CAPROVER_MCP_HTTP_TOKEN`.

When **no** HTTP token is configured and the bind address is localhost, MCP requests still require a bearer token and receive **401 Unauthorized** on every `/mcp` call. `GET /health` stays open without auth.

## Bind on the network

Set `CAPROVER_MCP_HTTP_HOST=0.0.0.0` only when `CAPROVER_MCP_HTTP_TOKEN` is set. Without the token, startup fails for any non-local address.

Put **TLS** in front (CapRover, nginx, Caddy, etc.): terminate HTTPS at the proxy and forward HTTP to this process on localhost.

### Host on CapRover (example)

1. Create an app (for example `caprover-mcp`) with **Do not expose as web app** if you only need internal access, or expose it and attach your domain.
2. Set persistent env vars on the app: `CAPROVER_URL`, `CAPROVER_PASSWORD`, `CAPROVER_MCP_MODE`, and `CAPROVER_MCP_HTTP_TOKEN`.
3. Use a **one-click or custom Dockerfile** command: `serve --http` with `CAPROVER_MCP_HTTP_HOST=0.0.0.0` and container port **3100**.
4. In CapRover **HTTP settings**, enable **HTTPS** and **Force HTTPS** on the app domain; point the proxy to container port `3100` (HTTP only inside the container).
5. Point Cursor or another MCP client at `https://caprover-mcp.yourdomain.com/mcp` with `Authorization: Bearer <token>`.

The MCP process does not terminate TLS itself; CapRover’s nginx edge handles certificates.

## Docker

If the deployment can only set environment variables and cannot change the command, set `CAPROVER_MCP_TRANSPORT=http` instead of passing `serve --http`. It defaults to `stdio`, and `serve --http` keeps working either way.

For a `docker run` example (localhost bind, env vars, and client JSON), see the README [**Quick start** — Providing on your own server to any AI](../../README.md#2-providing-on-your-own-server-to-any-ai).

The image exposes port `3100` and defines a Docker `HEALTHCHECK` that runs `better-caprover-mcp health`. In HTTP mode (`serve --http`) the process writes a marker file (`/tmp/better-caprover-mcp-http.active`) and the check requires `GET /health` on `CAPROVER_MCP_HTTP_PORT` to return body `ok`. Without `serve --http` (stdio) the check always passes. The process stops cleanly on `SIGTERM`, so `docker stop` does not wait for the kill timeout.

## Limits

HTTP-related environment variables, defaults, and limits are in the README [**Configuration**](../../README.md#configuration) table.

Audit lines on stderr record time, tool name, risk tier, and result—never argument values or secrets.
