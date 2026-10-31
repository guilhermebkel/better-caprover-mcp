<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="design/svg/horizontal-dark.svg" />
    <img src="design/svg/horizontal-light.svg" alt="better-caprover-mcp" width="420" />
  </picture>
</h1>

<p align="center">
  <strong>Let your AI agent operate your CapRover: deploy, configure and read logs, with a read-only default and a confirmation step before anything is deleted.</strong>
  <br />
  <em>An unofficial MCP server, one command with npx or Docker. Works with Claude, Cursor, Codex and any client that speaks MCP. Not affiliated with CapRover.</em>
</p>

<p align="center">
  <a href="https://better-caprover-mcp.guilherr.me"><img src="https://img.shields.io/badge/Website-b6f259" alt="Website" /></a>
  <a href="#quick-start"><img src="https://img.shields.io/badge/Quick_start-b6f259" alt="Quick start" /></a>
  <a href="https://www.npmjs.com/package/better-caprover-mcp"><img src="https://img.shields.io/npm/v/better-caprover-mcp?color=b6f259&label=npm" alt="npm version" /></a>
  <a href="https://github.com/guilhermebkel/better-caprover-mcp/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/guilhermebkel/better-caprover-mcp/ci.yml?branch=main&label=CI" alt="CI" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Telemetry-none-2ea44f" alt="No telemetry" />
</p>

---

**Giving an agent the keys to a server is the hard part.** A CapRover password is full access, and a model that can call "delete app" will sooner or later call it when it should not.

`better-caprover-mcp` gives the agent 14 named operations over the CapRover API and puts the safety in code, not in a prompt. The server starts in `readonly` mode and a mode only goes up when you restart it with another setting. Every change can be previewed with `dry_run`. Deleting does nothing until the person has seen what would be lost and said yes, and the password and the values of your environment variables never come back in a reply.

> **The mode is the barrier, not the model's good manners.** In `readonly` the write tools are not even registered, and every call is checked again when it runs.

---

## What you get

<table>
<tr>
<td width="50%" valign="top">

**Safe by default**

Starts `readonly`. `operate` lets the agent change apps, `admin` also lets it delete. Only you can raise the mode.

</td>
<td width="50%" valign="top">

**Preview before it writes**

Every change takes `dry_run` and returns what would change, without a write call to CapRover.

</td>
</tr>
<tr>
<td valign="top">

**Confirmation before a delete**

`delete_app` returns a preview and a one-time token tied to that exact call. It runs only when the call comes back with the token and the person's yes.

</td>
<td valign="top">

**No secrets in the replies**

Env var values are never returned (only `isSet`). The password and the values of an app's variables are masked in logs and errors.

</td>
</tr>
</table>

## Quick start

You need the address of your CapRover (`https://captain.your-domain.com`) and its password. CapRover has no user name, and servers with two-factor login turned on are not supported ([ADR 0010](docs/adr/0010-the-server-logs-in-with-the-password-only.md)).

### 1. Add it to your client

Claude Code:

```bash
claude mcp add caprover \
  -e CAPROVER_URL=https://captain.your-domain.com \
  -e CAPROVER_PASSWORD=your-password \
  -- npx -y better-caprover-mcp
```

Claude Desktop, Cursor and other clients, with `npx`:

```json
{
  "mcpServers": {
    "caprover": {
      "command": "npx",
      "args": ["-y", "better-caprover-mcp"],
      "env": {
        "CAPROVER_URL": "https://captain.your-domain.com",
        "CAPROVER_PASSWORD": "your CapRover password",
        "CAPROVER_MCP_MODE": "readonly"
      }
    }
  }
}
```

Or with Docker (`-i` is required: the server talks over stdin and stdout):

```json
{
  "mcpServers": {
    "caprover": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "CAPROVER_URL", "-e", "CAPROVER_PASSWORD", "-e", "CAPROVER_MCP_MODE", "ghcr.io/guilhermebkel/better-caprover-mcp:latest"],
      "env": {
        "CAPROVER_URL": "https://captain.your-domain.com",
        "CAPROVER_PASSWORD": "your CapRover password",
        "CAPROVER_MCP_MODE": "readonly"
      }
    }
  }
}
```

### 2. Check the login

```bash
CAPROVER_URL=https://captain.your-domain.com CAPROVER_PASSWORD=... npx -y better-caprover-mcp init
```

`init` tests the login and prints the client configuration above. Without the two variables it only prints the configuration.

### 3. Ask

```text
Which of my apps run an image tagged latest?
Set LOG_LEVEL=debug on the api app, but show me what changes first.
```

To let the agent change apps, set `CAPROVER_MCP_MODE=operate`; for deleting, `admin`.

### Run it as a server over HTTP

Use this when the client reaches the server over the network. Bind to localhost only (`127.0.0.1:3100`), and put TLS in front for anything else.

```bash
docker run -d --name caprover-mcp -p 127.0.0.1:3100:3100 \
  -e CAPROVER_URL=https://captain.your-domain.com \
  -e CAPROVER_PASSWORD='your CapRover password' \
  -e CAPROVER_MCP_HTTP_HOST=0.0.0.0 \
  -e CAPROVER_MCP_HTTP_TOKEN='your-long-random-secret' \
  ghcr.io/guilhermebkel/better-caprover-mcp:latest \
  serve --http
```

Then point the client at it:

```json
{
  "mcpServers": {
    "caprover": {
      "url": "http://127.0.0.1:3100/mcp",
      "headers": {
        "Authorization": "Bearer your-long-random-secret"
      }
    }
  }
}
```

More on HTTP bind and TLS: [`docs/product/remote-http.md`](docs/product/remote-http.md). Limits and other variables: [Configuration](#configuration).

## Example

<sub>Real output of the built server against a CapRover 1.15.5. The agent asks to delete an app; nothing is deleted yet.</sub>

```text
> delete_app {"app_name":"e2e-app"}
Not run. Would delete the app e2e-app (1 instances, image caprover/caprover-placeholder-app:latest,
0 custom domains) and 0 volumes. This cannot be undone. Show this to the person. Only if they say yes,
call delete_app again with the same inputs, user_confirmed true and this confirmation_token.
{"requires_confirmation":true,"confirmation_token":"718ebc698036ae0622c1246c60a46e0c","appName":"e2e-app",...}

> delete_app {"app_name":"e2e-app","user_confirmed":true,"confirmation_token":"718ebc698036ae0622c1246c60a46e0c"}
Deleted the app e2e-app and 0 volumes.
```

A token that was used, expired (5 minutes) or made for another call is refused, and the reply carries a new preview.

## Access modes

The mode decides which operations the client sees at all. Only the person can change it, by restarting the server with another `CAPROVER_MCP_MODE`.

| Mode | Operations available |
| --- | --- |
| `readonly` (default) | The 29 read operations |
| `operate` | Read, plus the 24 that change something and can be changed back |
| `admin` | Read, change, plus the 6 that delete (`delete_app`, `remove_custom_domain`, `delete_projects`, `delete_one_click_repo`, `delete_registry`, `delete_theme`) |
| `admin` with `CAPROVER_MCP_ALLOW_CRITICAL=1` | All of the above, plus the 8 critical ones |

`CAPROVER_MCP_TOOLSETS` then picks which groups of operations are registered. The default is `core,apps,domains,oneclick`; the other toolsets are opt-in so the tool list stays short. Ask `get_access` what is on and why a call was denied.

## Operations

71 operations in ten toolsets. The tier and toolset of every one, and the SDK method behind it, are in [`docs/product/risk-tiers.md`](docs/product/risk-tiers.md). A changing call takes `dry_run`; a deleting or critical call returns a preview and a `confirmation_token` first, and asks the person through the client when the client supports it.

| Toolset | Operations |
| --- | --- |
| `core` | `get_overview`, `get_access`, `get_guide`; `list_apps`, `get_app`, `get_app_runtime`, `get_app_logs`, `get_build_logs` (env var values are never returned, only `isSet`; logs are redacted); `diagnose_app`, `find_issues` (findings with evidence, never a fix) |
| `apps` | `list_apps_runtime`; `create_app`, `deploy_image`, `redeploy_app`, `deploy_archive`, `start_build`, `set_env_vars`, `bulk_env_update`, `scale_app`, `rename_app`; `delete_app` |
| `domains` | `add_custom_domain`, `enable_ssl`, `enable_root_ssl`, `set_force_ssl`; `remove_custom_domain`; critical: `update_root_domain` |
| `projects` | `list_projects`, `create_project`, `update_project`, `delete_projects` |
| `oneclick` | `list_one_click_apps`, `get_one_click_app`, `list_one_click_repos`, `add_one_click_repo`, `delete_one_click_repo`, `deploy_one_click`, `get_one_click_deploy_progress` |
| `registries` | `list_registries` (never a password), `add_registry`, `update_registry`, `delete_registry`, `set_default_push_registry`; critical: `enable_self_hosted_registry`, `disable_self_hosted_registry` |
| `cluster` | `list_nodes`, `get_load_balancer`; critical: `add_node` |
| `maintenance` | `get_disk_usage`, `list_unused_images`, `get_disk_cleanup`, `set_disk_cleanup`, `get_nginx_config`; critical: `delete_images`, `set_nginx_config`, `update_caprover` |
| `monitoring` | `get_net_data` (never a token), `set_net_data`, `get_go_access`, `set_go_access`, `list_go_access_reports` |
| `account` | `get_two_factor_status`, `get_pro_state`, `set_pro_api_key`, `list_pro_alerts`, `list_themes`, `get_current_theme`, `set_current_theme`, `save_theme`, `delete_theme`; critical: `set_password` |

Four SDK methods are kept for later, each with its reason in `scripts/sdk-coverage.json`: `updateConfigAndSave` (the `code` surface), `setProConfigs`, `getGoAccessReport` and `createBackup`. `get_app_runtime` and `list_apps_runtime` need a CapRover version that has the runtime endpoint (1.15.5 has none).

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `CAPROVER_URL` | none | The address of your CapRover, with `http://` or `https://`. Only its origin is used |
| `CAPROVER_PASSWORD` | none | The CapRover password |
| `CAPROVER_MCP_MODE` | `readonly` | `readonly`, `operate` or `admin` |
| `CAPROVER_MCP_ALLOW_CRITICAL` | off | Set to `1` to unlock the critical operations in `admin` mode (change the password, update CapRover, the root domain, nginx, add a node, the self-hosted registry, delete images) |
| `CAPROVER_MCP_SURFACE` | `tools` | How the operations are exposed: `tools` (one named tool per operation, shaped by `CAPROVER_MCP_TOOLSETS`), `code` (two tools, `search` and `execute`: the model writes a short script that runs in a sandbox and covers every operation the mode allows) or `both`. Anything else stops the server |
| `CAPROVER_MCP_TOOLSETS` | `core,apps,domains,oneclick` | Comma-separated toolsets to register: `core`, `apps`, `domains`, `projects`, `oneclick`, `registries`, `cluster`, `maintenance`, `monitoring`, `account`. An unknown name stops the server and lists the valid ones |
| `CAPROVER_MCP_LOG_LEVEL` | `info` | `error`, `info` or `debug`. `info` logs the start (transport, mode, what is set); `debug` also logs the configuration (CapRover address, HTTP host and port, whether a token is set). Never the password or the token. Audit lines are always written |
| `CAPROVER_MCP_TRANSPORT` | `stdio` | `stdio` or `http`. `http` makes a plain start (no arguments) serve Streamable HTTP, same as `serve --http` |
| `CAPROVER_MCP_HTTP_TOKEN` | none | Bearer secret for `serve --http` (minimum 8 characters); required for non-local HTTP bind |
| `CAPROVER_MCP_HTTP_HOST` | `127.0.0.1` | Address for `serve --http` |
| `CAPROVER_MCP_HTTP_PORT` | `3100` | Port for `serve --http` |
| `CAPROVER_MCP_MAX_HTTP_BODY_BYTES` | `1048576` | Max POST body size on `/mcp` |
| `CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE` | `120` | Max MCP HTTP requests per minute, counted in two buckets: failed auth and authenticated traffic. Each bucket is shared by every caller. |
| `CAPROVER_MCP_MAX_HTTP_SESSIONS` | `64` | Max concurrent Streamable HTTP MCP sessions |
| `CAPROVER_MCP_HTTP_SESSION_TTL_MS` | `86400000` | Idle lifetime of an HTTP MCP session (ms); each request renews it |
| `CAPROVER_MCP_MAX_CONCURRENT` | `5` | Max parallel tool runs in this MCP instance |

Without `CAPROVER_URL` and `CAPROVER_PASSWORD` the server still starts, and every call tells the model what is missing.

## How it works

```text
  agent ──▶ 1. MODE ──▶ 2. VALIDATE ──▶ 3. PREVIEW / CONFIRM ──▶ 4. CALL ──▶ 5. REDACT
  (MCP)     is the tool   strict schema,  dry_run, or a token     CapRover    mask password
            registered?   errors list     for a delete            API (SDK)   and env values
                          valid values
```

The work is split on purpose:

| Part | Does | Why |
| --- | --- | --- |
| **Operations** (`src/Operations/`) | One class per thing a person does, with its schema, risk tier and description | One manifest feeds every surface and the policy |
| **Policy and runner** (`src/Services/`) | Applies the mode, `dry_run`, the confirmation token and the masking | Rules that cannot fail live in code with a test, never only in a prompt |
| **Entry points** (`src/Setup/`) | Start the program: arguments, transport, `init` | They only call the builders; no operation, policy or adapter logic |
| **CapRover adapter** (`src/Adapters/CapRover/`) | The only place that imports the official `caprover-api` SDK | The SDK is experimental; one folder absorbs its changes |

Decisions are in [`docs/adr/`](docs/adr/), the rules operations follow in [`docs/mcp-standards.md`](docs/mcp-standards.md).

## Privacy and safety

- **The only network exit is your `CAPROVER_URL`.** No telemetry, no analytics, nothing else is contacted.
- **The server never runs a command on your machine and does not read your files.** It only reads its environment variables.
- **Secrets stay out.** The password and env var values are masked in every reply, log and error, and tested with fake secrets.
- **The CapRover password is full access.** The modes are enforced by this server, not by CapRover, so give it to a client you trust.

Found a way around any of this? Open an issue without secrets in it.

## How it compares

- **The CapRover dashboard and CLI** are the reference for doing it by hand. This server lets an agent do the same steps, with a preview and a confirmation you control.
- **A generic MCP wrapper over the HTTP API** typically gives the agent every endpoint with no modes and no confirmation. Here there is no "send any request" tool: that SDK method is left out on purpose ([ADR 0003](docs/adr/0003-one-manifest-for-every-operation.md)).
- **Other CapRover MCP servers** exist. This one is a separate, unrelated project, with a one-command setup and the safety rules above.

## FAQ

<details>
<summary><b>Does it work with CapRover's two-factor login?</b></summary>

No. The code lasts 30 seconds. Over stdio, a client restarts the server each session; over HTTP the process is long-lived, but the server still has no way to obtain a fresh code, so it cannot be kept in an environment variable. The server logs in with the password only ([ADR 0010](docs/adr/0010-the-server-logs-in-with-the-password-only.md)).

</details>

<details>
<summary><b>Can the agent raise its own mode?</b></summary>

No. The mode is read at startup from the environment, and nothing the agent can call changes it. Tell it to ask you, and restart the server with `CAPROVER_MCP_MODE=operate` or `admin`.

</details>

<details>
<summary><b>Why does `get_app_runtime` fail on my CapRover?</b></summary>

The endpoint it uses is missing in older CapRover versions (1.15.5 has none). The reply says so and points to `get_app_logs` and `get_build_logs`.

</details>

## Roadmap

- [x] **Core:** the first 14 operations on the `tools` surface, access modes, `dry_run`, confirmation token, redaction, tested against a real CapRover.
- [x] **The rest of the CapRover API:** [#3](https://github.com/guilhermebkel/better-caprover-mcp/issues/3) — 67 operations in ten toolsets; four SDK methods stay planned, with reasons.
- [x] **Diagnostics** (`diagnose_app`, `find_issues`, `redeploy_app`, `bulk_env_update`): [#4](https://github.com/guilhermebkel/better-caprover-mcp/issues/4)
- [ ] **Code Mode** (`search` and `execute` in a sandbox) and a benchmark: [#5](https://github.com/guilhermebkel/better-caprover-mcp/issues/5) — the `code` surface and the sandbox are built (`CAPROVER_MCP_SURFACE`); the benchmark that picks the default is still to run
- [x] **Remote HTTP (one CapRover server per MCP instance):** [#6](https://github.com/guilhermebkel/better-caprover-mcp/issues/6) — multi-server in one process is out of scope; run one instance per Captain.

## Contributing

Issues and pull requests are welcome. Start with [`AGENTS.md`](AGENTS.md), which says what to read for each kind of task; vocabulary is in [GLOSSARY.md](GLOSSARY.md) and design decisions in [`docs/adr/`](docs/adr/).

### Development

Needs the Node version in `.nvmrc` and pnpm.

```bash
nvm use
pnpm install
pnpm check   # typecheck, lint, dead code, duplication, SDK drift, tests, build and a smoke run of the bundle
```

`pnpm test:integration` runs the tests that need a real CapRover (CI starts one; locally, `scripts/start-caprover.sh` starts a throwaway CapRover in Docker with its default password and waits until it is ready; or set `CAPROVER_TEST_URL` and `CAPROVER_TEST_PASSWORD` to use your own), and needs `pnpm build` first. A second run reuses the CapRover that is installed, so it is fast. To remove it: `docker swarm leave --force` and `docker rm -f captain-install`. `pnpm sdk:drift` fails when the CapRover SDK has a method that is not classified in `scripts/sdk-coverage.json`.

`pnpm smoke -- docker run -i --rm <image>` runs the same smoke test against an image. Read `AGENTS.md` first: it says what to read for each kind of task.

---

<p align="center">
  <strong>Let the agent operate. Keep the keys in your hands.</strong>
</p>

<p align="center">
  <a href="https://www.star-history.com/#guilhermebkel/better-caprover-mcp&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=guilhermebkel/better-caprover-mcp&type=Date&theme=dark" />
      <img alt="Star history" src="https://api.star-history.com/svg?repos=guilhermebkel/better-caprover-mcp&type=Date" width="600" />
    </picture>
  </a>
</p>

<p align="center">
  MIT License &copy; Guilherme Mota
</p>
