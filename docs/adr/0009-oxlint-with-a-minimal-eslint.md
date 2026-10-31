# Oxlint runs the lint, a minimal ESLint keeps what it cannot

`pnpm lint` runs Oxlint (`.oxlintrc.json`) for almost every rule, including the type-aware ones through `tsgolint`, and three JS plugins: `@stylistic/eslint-plugin`, `eslint-plugin-sonarjs` and our own rules in `scripts/eslint-local-rules.mjs`. ESLint stays for what Oxlint cannot run or runs differently (`eslint.config.mjs`). `scripts/lint.mjs` runs both in parallel and fails if either fails. The decision, with its measurements, comes from the same decision in `tocomevidencia` (its ADR 0022).

## Considered options

- ESLint alone: rejected. The type-aware run is slow on a cold clone.
- Biome: rejected. It does not reuse the local rules and it is not `@stylistic`.

## Consequences

- A new local rule is added to `scripts/eslint-local-rules.mjs`, to `.oxlintrc.json` and to `scripts/eslint-local-rules.test.mjs`.
- A rule that guards a secret, the protocol stdout, the host shell, a vendor boundary or a layer has a failing example in `scripts/lint-rules.test.mjs`, which lints a throwaway file with the real config and expects the rule's name.
