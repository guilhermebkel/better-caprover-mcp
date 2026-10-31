# better-caprover-mcp

An MCP server for [CapRover](https://caprover.com), run with `npx` or Docker. **Unofficial: not affiliated with CapRover and unrelated to the [`caprover-mcp`](https://github.com/ivan-saorin/caprover-mcp) project.**

It lets an agent (Claude, Cursor, Codex) operate a CapRover server, with setup in one command and safety by default: the server starts in `readonly` mode.

## Status

The `tools` surface works: 14 named operations that read apps, deploy images, change settings and delete apps, with access modes and a confirmation step for deletes. They are tested against a real CapRover. Planned, in order: the rest of the CapRover API (the SDK has 74 methods; `src/Adapters/CapRover/sdk-coverage.json` says which are still open), diagnostics, and Code Mode (`search` and `execute`). The decisions are in [`docs/adr/`](docs/adr/) and the rules the operations follow are in [`docs/mcp-standards.md`](docs/mcp-standards.md).

## Run it

You need the address of your CapRover (`https://captain.your-domain.com`) and its password. `npx -y better-caprover-mcp init` prints the client configuration below and tests the login when `CAPROVER_URL` and `CAPROVER_PASSWORD` are set.

With `npx`, in the client configuration (Claude Desktop and Cursor use this format; in Claude Code, `claude mcp add caprover -e CAPROVER_URL=https://captain.your-domain.com -e CAPROVER_PASSWORD=... -- npx -y better-caprover-mcp`):

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

With Docker (`-i` is required: the server talks over stdin and stdout):

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

The package and the image are not published yet; until then, build them from this repository (below).

| Variable | Default | Meaning |
| --- | --- | --- |
| `CAPROVER_URL` | none | The address of your CapRover, with `http://` or `https://`. Only its origin is used |
| `CAPROVER_PASSWORD` | none | The CapRover password. CapRover has no user name |
| `CAPROVER_MCP_MODE` | `readonly` | `readonly`, `operate` or `admin`: how much the server may do |
| `CAPROVER_MCP_ALLOW_CRITICAL` | off | Set to `1` to unlock critical operations in `admin` mode. No operation is critical yet |

Without `CAPROVER_URL` and `CAPROVER_PASSWORD` the server still starts, and every call tells the model what is missing. The CapRover password gives full access, so the modes are enforced by this server, not by CapRover. Servers with CapRover's two-factor login turned on are not supported (`docs/adr/0010-the-server-logs-in-with-the-password-only.md`).

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

Every write takes `dry_run` and returns what it would change without writing. `delete_app` changes nothing on its first call: it returns a preview and a `confirmation_token` tied to that exact call. It runs only when called again with `user_confirmed` and the token, once, within 5 minutes. This makes the model show the person what will be lost; it does not stop a manipulated model, so the real barrier is the mode.

## Development

Needs the Node version in `.nvmrc` and pnpm.

```bash
nvm use
pnpm install
pnpm check   # typecheck, lint, dead code, duplication, SDK drift, tests, build and a smoke run of the bundle
```

`pnpm test:integration` runs the tests that need a real CapRover (CI starts one; locally, `scripts/start-caprover.sh` starts a throwaway CapRover in Docker with its default password and waits until it is ready; or set `CAPROVER_TEST_URL` and `CAPROVER_TEST_PASSWORD` to use your own), and needs `pnpm build` first. Remove it afterwards with `docker rm -f captain-install`. `pnpm sdk:drift` fails when the CapRover SDK has a method that is not classified in `src/Adapters/CapRover/sdk-coverage.json`.

`pnpm smoke -- docker run -i --rm <image>` runs the same smoke test against an image. Read `AGENTS.md` first: it says what to read for each kind of task.

## License

MIT. See [LICENSE](LICENSE).
