# The layout of `src/`: Setup, Testing and a suffix per folder

`src/Server/` held two jobs: the ways to start the program and the code that builds the MCP server. `src/Adapters/CapRover/` held test doubles and a data file next to the adapter. "A file name says its folder" was only a sentence in the docs, and it had already been broken.

## Decision

Folders, in layer order (a folder imports only the ones above it in this list), each with its suffix:

| Folder | Holds | Suffix |
| --- | --- | --- |
| `Errors/` | error classes, import nothing | `Error` |
| `Protocols/` | types only | `Protocol` |
| `Schemas/` | Zod schemas | `Schema` |
| `Utils/` | static helper classes | `Util` |
| `Services/` and `Adapters/<Vendor>/` | business rules; one external service each | `Service`, `Adapter` |
| `Operations/` | one class per CapRover operation | `Operation` |
| `Surfaces/` | what exposes the operations over MCP: the tools surface, the manifest, the builders of the MCP server | `Surface` |
| `Setup/` | the ways to start the program: command line, stdio, HTTP, `init`, `/health` | `Runner` |

- **`Setup/` only starts the program.** It parses arguments, chooses a transport and calls a surface. It never imports an adapter (lint). `InitRunner` reads the login through `LoginReportService`.
- **The builders of the MCP server live in `Surfaces/`.** They wire services, adapters and operations into an `McpServer` and register the tools surface, so they sit above `Operations` and may import the MCP SDK, which `Surfaces/` already may. No new folder was needed. `ServerBuilder`, `SharedMcpRuntimeBuilder`, `McpInstructionsBuilder` and `OperationManifest` became `ServerSurface`, `SharedMcpRuntimeSurface`, `McpInstructionsSurface` and `OperationManifestSurface`, because a class is renamed when it is meant to equal the name of its file. `OperationManifestSurface` moved from `Operations/` because it imports every operation.
- **Test doubles live in `src/Testing/`** (the fake client, the mock CapRover server and its route builder, the recorded and written fixtures). Production code never imports it (lint). It is not in the suffix map: its files are named after what they double.
- **`src/Adapters/CapRover/` holds the adapter only.** `sdk-coverage.json` is data for the drift check, so it moved to `scripts/sdk-coverage.json`.
- **`src/types/`** stays: ambient declarations (`*.d.ts`) of build-time constants, outside the layers and exempt from the suffix rule.
- **`AppViewUtil`, `DockerLogUtil` and `DotenvUtil` stay in `Utils/`.** They are static functions over protocol types, with no I/O and no vendor import. Knowing a CapRover term does not make a file an adapter.
- **`local/file-suffix` checks the names.** The map of folder to suffix lives in `scripts/eslint-local-rules.mjs`. A folder not in the map is exempt (`Testing/`, `types/`), and so are `index.ts`, `src/main.ts` and `*.d.ts`.

## Consequences

- A new folder under `src/` needs its entry in the map before its first file, or an exemption line in `docs/code-standards.md`.
- `pnpm test` checks that every path the living docs and configs name exists (`scripts/doc-paths.test.mjs`).
- No behavior changed: the tools, their descriptions and schemas are the ones the server tests already compare.
