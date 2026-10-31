# TypeScript, run by npx or by Docker, the same program

The server is written in TypeScript on Node 22. It is bundled into one file, `dist/main.js`, with every dependency inside, and that file is what both ways of running start.

## Decision

- **npx.** The npm package ships the bundle and no runtime dependency, so `npx -y better-caprover-mcp` installs one file.
- **Docker.** The image copies the same file to `/usr/local/bin/better-caprover-mcp` and sets it as the entrypoint. A stdio client starts it with `docker run -i --rm`; the `-i` is required.
- **One test for both.** `scripts/package-smoke.mjs` starts the server through any command and checks the reply to `initialize` and that stdout carries only JSON-RPC. CI runs it through `node`, through `npx` on a packed tarball and through `docker run -i`.

## Considered options

- Python with FastMCP, like the only existing CapRover MCP: rejected. `npx` gives the one-command setup, and the official CapRover SDK is TypeScript.
- Publishing the dependencies as `dependencies`: rejected. A bundle starts faster under `npx` and gives the image nothing to install; the cost is that the SDK and Zod sit in `devDependencies`.

## Consequences

- The version is injected at build time (`__PACKAGE_VERSION__`), so the package and the server report the same one.
- The Docker build stage installs from the lockfile; the runtime stage holds one file and runs as `node`.
