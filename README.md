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

### Remote HTTP (optional)

Stdio stays the default. To listen for Streamable HTTP on the same machine:

```bash
export CAPROVER_MCP_HTTP_TOKENS='{"cursor":"<long-random-secret>"}'
export CAPROVER_MCP_HTTP_HOST=0.0.0.0
better-caprover-mcp serve --http
```

Clients call `http://127.0.0.1:3100/mcp` with `Authorization: Bearer <secret>`. Put TLS in front when the listener is reachable on the network. Details: [`docs/product/remote-http.md`](docs/product/remote-http.md) and ADR 0013.

### 3. Ask

```text
Which of my apps run an image tagged latest?
Set LOG_LEVEL=debug on the api app, but show me what changes first.
```

To let the agent change apps, set `CAPROVER_MCP_MODE=operate`; for deleting, `admin`.

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
| `readonly` (default) | The 7 read operations |
| `operate` | Read, plus the 6 that change an app |
| `admin` | Read, change, plus `delete_app` |

## Operations

| Operation | Tier | What it does |
| --- | --- | --- |
| `get_overview` | read | CapRover version, domain, app count, and what this server may do |
| `list_apps`, `get_app` | read | Find apps; read one app (env var values are never returned, only `isSet`) |
| `get_app_runtime` | read | Live state of an app. Needs a CapRover version that has the endpoint (1.15.5 has none) |
| `get_app_logs`, `get_build_logs` | read | The last lines of the running app or of the latest build, with secrets replaced by `[REDACTED]` |
| `list_one_click_apps` | read | The one-click templates CapRover offers |
| `create_app` | write | Make an empty app |
| `deploy_image` | write | Deploy a Docker image to an app; the deploy goes on in the background |
| `set_env_vars` | write | Set and delete env vars from `KEY=value` lines; keeps the others |
| `scale_app` | write | Set the number of instances (0 stops the app) |
| `add_custom_domain`, `enable_ssl` | write | Attach a domain; turn on HTTPS |
| `delete_app` | destructive | Delete an app, and its volumes only if asked |

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `CAPROVER_URL` | none | The address of your CapRover, with `http://` or `https://`. Only its origin is used |
| `CAPROVER_PASSWORD` | none | The CapRover password |
| `CAPROVER_MCP_MODE` | `readonly` | `readonly`, `operate` or `admin` |
| `CAPROVER_MCP_ALLOW_CRITICAL` | off | Set to `1` to unlock critical operations in `admin` mode. No operation is critical yet |
| `CAPROVER_MCP_HTTP_TOKENS` | none | JSON map of client names to bearer secrets; required for non-local HTTP bind |
| `CAPROVER_MCP_HTTP_HOST` | `127.0.0.1` | Address for `serve --http` |
| `CAPROVER_MCP_HTTP_PORT` | `3100` | Port for `serve --http` |
| `CAPROVER_MCP_SERVERS` / `CAPROVER_MCP_SERVERS_FILE` | none | Several CapRover servers; see `docs/product/remote-http.md` |

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

No. The code lasts 30 seconds and a client starts this server again every session, so it cannot be kept in an environment variable. The server logs in with the password only ([ADR 0010](docs/adr/0010-the-server-logs-in-with-the-password-only.md)).

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

- [x] **Core:** 14 operations on the `tools` surface, access modes, `dry_run`, confirmation token, redaction, tested against a real CapRover.
- [ ] **The rest of the CapRover API** (about 56 more SDK methods): [#3](https://github.com/guilhermebkel/better-caprover-mcp/issues/3)
- [ ] **Diagnostics** (`diagnose_app`, `find_issues`): [#4](https://github.com/guilhermebkel/better-caprover-mcp/issues/4)
- [ ] **Code Mode** (`search` and `execute` in a sandbox) and a benchmark: [#5](https://github.com/guilhermebkel/better-caprover-mcp/issues/5)
- [ ] **Remote HTTP and several CapRover servers:** [#6](https://github.com/guilhermebkel/better-caprover-mcp/issues/6)

## Contributing

Issues and pull requests are welcome. Start with [`AGENTS.md`](AGENTS.md), which says what to read for each kind of task; vocabulary is in [GLOSSARY.md](GLOSSARY.md) and design decisions in [`docs/adr/`](docs/adr/).

### Development

Needs the Node version in `.nvmrc` and pnpm.

```bash
nvm use
pnpm install
pnpm check   # typecheck, lint, dead code, duplication, SDK drift, tests, build and a smoke run of the bundle
```

`pnpm test:integration` runs the tests that need a real CapRover (CI starts one; locally, `scripts/start-caprover.sh` starts a throwaway CapRover in Docker with its default password and waits until it is ready; or set `CAPROVER_TEST_URL` and `CAPROVER_TEST_PASSWORD` to use your own), and needs `pnpm build` first. A second run reuses the CapRover that is installed, so it is fast. To remove it: `docker swarm leave --force` and `docker rm -f captain-install`. `pnpm sdk:drift` fails when the CapRover SDK has a method that is not classified in `src/Adapters/CapRover/sdk-coverage.json`.

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
