# Publishing with a manual release workflow and npm trusted publishing

A release is started by hand: Actions, Release, "Run workflow" on `main`, choosing `patch`, `minor`, `major` or `none` (release the current version as is). The workflow bumps `package.json`, runs `pnpm check`, commits `release: vX.Y.Z [skip ci]`, tags `vX.Y.Z`, pushes both to `main`, publishes to npm with provenance, creates the GitHub Release with generated notes, and then builds and pushes the multi-architecture image from the tag. The shape comes from the `scenec` project, which uses the same steps for its package.

npm publishing uses trusted publishing (OIDC, npm 11.5.1 or newer, `id-token: write`, no token). The first version is published by hand, then the trusted publisher is configured for `release.yml`. The workflow skips `npm publish` when the version is on npm already and skips a tag or a GitHub Release that exists, so a failed run is repeated with `none`.

## Considered options

- A tag that starts the release (the first version of this workflow): rejected. The person has to bump the version, merge it and tag it by hand, and a tag that differs from `package.json` is possible. The manual run makes the bump, the tag and the package one step.
- An `NPM_TOKEN` secret: rejected. A token can leak and does not give provenance by itself; trusted publishing leaves nothing to store.
- Release notes from a changesets step: rejected for now. Generated notes are enough for a project with one maintainer.

## Consequences

- Two checks guard the package: `pnpm check:pack` (files, size, manifest) and `pnpm check:licenses`. The second differs from `scenec`: here the dependencies are `devDependencies` bundled into one file, so it follows what the bundler read, not the `dependencies` field.
- The first publish is manual, and the `repository` field in `package.json` must match the GitHub repository exactly, case included.
- The release commit goes straight to `main`, so branch protection must allow `github-actions[bot]`.
