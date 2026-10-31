# better-caprover-mcp

An MCP server for [CapRover](https://caprover.com), run with `npx` or Docker. **Unofficial: not affiliated with CapRover and unrelated to the [`caprover-mcp`](https://github.com/ivan-saorin/caprover-mcp) project.**

It lets an agent (Claude, Cursor, Codex) operate a CapRover server, with setup in one command and safety by default: the server starts in `readonly` mode.

## Status

Bootstrap. The server starts, answers `initialize` and exposes no operation yet. What is planned, in order: the operations of the CapRover API in a single manifest, two ways of exposing them (named tools, and Code Mode with `search` and `execute`), access modes with confirmation for destructive calls, and diagnostics. The decisions are in [`docs/adr/`](docs/adr/) and the rules the operations will follow are in [`docs/mcp-standards.md`](docs/mcp-standards.md).

## Run it

With `npx`, in the client configuration (Claude Desktop and Cursor use this format; in Claude Code, `claude mcp add caprover -- npx -y better-caprover-mcp`):

```json
{
  "mcpServers": {
    "caprover": {
      "command": "npx",
      "args": ["-y", "better-caprover-mcp"],
      "env": { "CAPROVER_MCP_MODE": "readonly" }
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
      "args": ["run", "-i", "--rm", "-e", "CAPROVER_MCP_MODE", "ghcr.io/guilhermebkel/better-caprover-mcp:latest"],
      "env": { "CAPROVER_MCP_MODE": "readonly" }
    }
  }
}
```

The package and the image are not published yet; until then, build them from this repository (below).

| Variable | Default | Meaning |
| --- | --- | --- |
| `CAPROVER_MCP_MODE` | `readonly` | `readonly`, `operate` or `admin`: how much the server may do |

The variables that connect to your CapRover (`CAPROVER_URL`, `CAPROVER_PASSWORD`) arrive with the first operation. The CapRover password gives full access, so the modes are enforced by this server, not by CapRover.

## Development

Needs the Node version in `.nvmrc` and pnpm.

```bash
nvm use
pnpm install
pnpm check   # typecheck, lint, dead code, duplication, tests, build and a smoke run of the bundle
```

`pnpm smoke -- docker run -i --rm <image>` runs the same smoke test against an image. Read `AGENTS.md` first: it says what to read for each kind of task.

## License

MIT. See [LICENSE](LICENSE).
