# The repository harness comes from tocomevidencia

The lint rules, the local ESLint rules, the quality tools, the standards docs, the agent docs and the check scripts are adapted from the author's private repository `tocomevidencia`, which took them from harness-ledger (MIT). The goal is that agents work alone and a mistake fails a tool, not a review.

## Considered options

- Starting without a harness: rejected. Rules written only as text get broken; each one that a tool can check is a lint rule, a type or a test.
- Copying the harness as it is: rejected. Next.js, the database, the interface and the browser tests do not exist here, so their rules, scripts and docs were removed; the operation rules (`operation-name`, `operation-port`) replace the AI tool rules.

## Consequences

- `pnpm check` is the single gate, locally and in CI.
- A limit is never raised and an ignore is never added to pass.
- A rule that needs code this project does not have yet (the operation port, the manifest) is marked planned in the standards and gets its tool in the pull request that adds the code.
