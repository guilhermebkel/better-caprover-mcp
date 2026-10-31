# Remote HTTP mode

Run the MCP server so a client on another machine can connect over **Streamable HTTP**, and optionally manage **several CapRover servers** from one process.

## Start HTTP locally

```bash
export CAPROVER_URL=https://captain.example.com
export CAPROVER_PASSWORD='your password'
export CAPROVER_MCP_HTTP_TOKEN='choose-a-long-random-secret'
better-caprover-mcp serve --http
```

The server listens on `127.0.0.1:3100` by default. MCP endpoint: `http://127.0.0.1:3100/mcp`. Health: `http://127.0.0.1:3100/health`.

Clients must send `Authorization: Bearer <secret>` on every MCP request. The secret must match `CAPROVER_MCP_HTTP_TOKEN`.

When **no** HTTP token is configured and the bind address is localhost, MCP requests still require a bearer token and receive **401 Unauthorized** on every `/mcp` call. `GET /health` stays open without auth.

## Bind on the network

Set `CAPROVER_MCP_HTTP_HOST=0.0.0.0` only when `CAPROVER_MCP_HTTP_TOKEN` is set. Without the token, startup fails for any non-local address.

Put **TLS** in front (CapRover, nginx, Caddy, etc.): terminate HTTPS at the proxy and forward HTTP to this process on localhost.

### Host on CapRover (example)

1. Create an app (for example `caprover-mcp`) with **Do not expose as web app** if you only need internal access, or expose it and attach your domain.
2. Set persistent env vars on the app: `CAPROVER_MCP_SERVERS_FILE` or legacy `CAPROVER_URL` / `CAPROVER_PASSWORD`, plus `CAPROVER_MCP_HTTP_TOKEN`.
3. Mount server JSON and CapRover passwords as **App Secrets** / secret files; map `passwordFile` paths in the JSON to those mount paths.
4. Use a **one-click or custom Dockerfile** command: `serve --http` with `CAPROVER_MCP_HTTP_HOST=0.0.0.0` and container port **3100**.
5. In CapRover **HTTP settings**, enable **HTTPS** and **Force HTTPS** on the app domain; point the proxy to container port `3100` (HTTP only inside the container).
6. Point Cursor or another MCP client at `https://caprover-mcp.yourdomain.com/mcp` with `Authorization: Bearer <token>`.

The MCP process does not terminate TLS itself; CapRover’s nginx edge handles certificates.

## Docker

```bash
docker run -d --name caprover-mcp -p 3100:3100 \
  -e CAPROVER_URL -e CAPROVER_PASSWORD \
  -e CAPROVER_MCP_HTTP_HOST=0.0.0.0 \
  -e CAPROVER_MCP_HTTP_TOKEN='your-long-random-secret' \
  ghcr.io/guilhermebkel/better-caprover-mcp:latest \
  serve --http
```

The image exposes port `3100` and defines a Docker `HEALTHCHECK` via `scripts/docker-healthcheck.sh`. In HTTP mode (`serve --http`) the process writes a marker file (default `/tmp/better-caprover-mcp-http.active`) and the check requires `GET /health` to return body `ok`. The healthcheck script accepts optional `CAPROVER_MCP_HTTP_MARKER_PATH` to point at that file; it is not a variable on the MCP server itself. Stdio-only runs leave no HTTP marker, so the script exits success and a plain `docker run` without `serve --http` stays healthy.

## Several CapRover servers

Use a JSON file (recommended for Docker secrets):

```json
{
  "servers": [
    {
      "name": "prod",
      "url": "https://captain.prod.example.com",
      "mode": "readonly",
      "passwordFile": "/run/secrets/caprover_prod"
    },
    {
      "name": "staging",
      "url": "https://captain.staging.example.com",
      "mode": "operate",
      "passwordEnv": "CAPROVER_STAGING_PASSWORD"
    }
  ]
}
```

```bash
export CAPROVER_MCP_SERVERS_FILE=/etc/better-caprover-mcp/servers.json
export CAPROVER_MCP_HTTP_TOKEN='your-long-random-secret'
better-caprover-mcp serve --http
```

Alternatively, set the same array in `CAPROVER_MCP_SERVERS` (one line of JSON).

Every tool call must include `"server_name": "prod"` or `"server_name": "staging"`. `get_overview` lists configured servers and their modes without CapRover URLs.

The legacy variables `CAPROVER_URL` and `CAPROVER_PASSWORD` still define a single server when no multi-server list is set; then `server_name` is optional.

## Limits

| Variable | Default | Meaning |
| --- | --- | --- |
| `CAPROVER_MCP_HTTP_HOST` | `127.0.0.1` | Bind address |
| `CAPROVER_MCP_HTTP_PORT` | `3100` | TCP port |
| `CAPROVER_MCP_HTTP_TOKEN` | none | Bearer secret for `/mcp` (minimum 8 characters); required for non-local bind |
| `CAPROVER_MCP_MAX_HTTP_BODY_BYTES` | `1048576` | Max POST body size |
| `CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE` | `120` | Max MCP HTTP requests per minute. Failed auth attempts are counted per client remote address; all authenticated MCP traffic shares one bucket. Behind a reverse proxy every upstream client often shares one remote address for failed auth, so that throttling is shared unless the proxy sets forwarded client metadata the process can use (this server does not read `X-Forwarded-For`). |
| `CAPROVER_MCP_MAX_HTTP_SESSIONS` | `64` | Max concurrent Streamable HTTP MCP sessions |
| `CAPROVER_MCP_HTTP_SESSION_TTL_MS` | `86400000` | Max idle lifetime of an HTTP MCP session (milliseconds) |
| `CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER` | `5` | Max parallel tool runs per server name |

Audit lines on stderr record time, tool name, server name, risk tier, and result—never argument values or secrets.
