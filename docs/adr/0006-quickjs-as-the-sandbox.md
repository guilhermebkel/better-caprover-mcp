# QuickJS, compiled to WebAssembly, runs the model's script

The `code` surface runs the script the model writes inside QuickJS (`quickjs-emscripten`). By default the script sees no host function; the host adds only `caprover.<group>.<operation>(args)`, each going through the policy. The credentials stay in the host.

## Considered options

- Cloudflare's Dynamic Worker isolate: rejected for the local path. It needs the Workers runtime; it stays an option for a remote deployment.
- `node:vm`: rejected. It is not a security boundary.
- `isolated-vm`: rejected. It compiles native code, which breaks the one-command `npx` setup.

## Consequences

- Each `execute` gets a new sandbox with limits on memory, stack, time, number of calls and size of the output.
- A suite of hostile scripts (process, require, dynamic import, fetch, an endless loop, a huge allocation) must fail closed.
- Planned: the sandbox arrives with the `code` surface.
