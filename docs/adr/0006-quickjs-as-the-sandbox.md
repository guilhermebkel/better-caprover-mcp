# QuickJS, compiled to WebAssembly, runs the model's script

The `code` surface runs the script the model writes inside QuickJS (`quickjs-emscripten`). By default the script sees no host function; the host adds only `caprover.<group>.<operation>(args)`, each going through the policy. The credentials stay in the host.

## Considered options

- Cloudflare's Dynamic Worker isolate: rejected for the local path. It needs the Workers runtime; it stays an option for a remote deployment.
- `node:vm`: rejected. It is not a security boundary.
- `isolated-vm`: rejected. It compiles native code, which breaks the one-command `npx` setup.

## Consequences

- Each `execute` gets a new sandbox with limits on memory, stack, time, number of calls and size of the output.
- A suite of hostile scripts (process, require, dynamic import, fetch, an endless loop, a huge allocation) must fail closed.
- The sandbox is built: `src/Adapters/Sandbox/` holds the only import of `quickjs-emscripten`, with the WebAssembly embedded in the bundle so `npx` and the Docker image stay one file. A hostile suite runs process, require, dynamic import, fetch, timers, constructor chains, an endless loop, a huge allocation, deep recursion, a huge output and many host calls.
- The memory limit counts what the engine allocates as objects and strings. A script that fills large typed arrays or array buffers is not counted by it, so the computing-time limit and the ceiling of the WebAssembly heap are what stop it.
