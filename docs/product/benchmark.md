# Benchmark: named tools or Code Mode

Status: the method is fixed; no run has been made yet, so there are no numbers and the default of `CAPROVER_MCP_SURFACE` stays `tools`. Issue [#5](https://github.com/guilhermebkel/better-caprover-mcp/issues/5) (S9 and S10) stays open until the table below holds real measurements.

## Method

Each task runs against a real CapRover in Docker (`scripts/start-caprover.sh`), from the same starting state, with the same model and client, once per configuration:

- `tools` with the core toolset (`CAPROVER_MCP_SURFACE=tools`, default toolsets).
- `tools` with all toolsets (`CAPROVER_MCP_TOOLSETS` lists the ten).
- `code` (`CAPROVER_MCP_SURFACE=code`).

For every run record the tokens in and out (as the client reports them), the number of rounds (model turns), and whether the task succeeded by its check. The numbers come from real runs, never estimates.

## Tasks

1. Deploy an image and set its env vars; check: the app runs and the vars are set.
2. Find why an app does not start; check: the model names the cause planted in the app.
3. Clean unused images; check: the unused images are gone and the used ones remain.

## Results

| Task | Configuration | Tokens in | Tokens out | Rounds | Success |
| --- | --- | --- | --- | --- | --- |
| Not measured yet | | | | | |

## Open inputs

The model and the client for the runs, and the sandbox limits after a first measurement (`DEFAULT_SANDBOX_LIMITS` in `src/Adapters/Sandbox/QuickJsSandboxAdapter.ts`).
