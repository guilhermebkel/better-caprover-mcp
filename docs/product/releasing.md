# Releasing

A release publishes the npm package `better-caprover-mcp`, the GitHub Release and the image `ghcr.io/guilhermebkel/better-caprover-mcp` from one commit. It is started by hand (ADR 0012). The workflow is `.github/workflows/release.yml`.

## One time

1. Publish the first version by hand, because npm trusted publishing can be set only for a package that exists: on `main`, after `pnpm check`, run `npm publish --access public` (version `0.1.0`: set it in `package.json` first).
2. On npmjs.com, open the package, "Settings", "Trusted publisher", and add GitHub Actions: repository `guilhermebkel/better-caprover-mcp`, workflow `release.yml`. There is no npm token to store.
3. The image needs no secret: the workflow pushes it with the `GITHUB_TOKEN`. After the first push, open the package page on GitHub and make it public, so `docker run` works without login.
4. If `main` is protected, let `github-actions[bot]` push the release commit and the tag.

## Each release

1. Actions, Release, "Run workflow" on `main`. Choose `patch`, `minor` or `major`; `none` releases the current version as is (use it for the first release after step 1 above, so only the tag, the GitHub Release and the image are made).
2. The workflow bumps `package.json`, runs `pnpm check` (typecheck, lint, quality, SDK drift, tests, build, pack check, license check, smoke), commits `release: vX.Y.Z [skip ci]`, tags `vX.Y.Z`, pushes both, publishes to npm with provenance and creates the GitHub Release with generated notes.
3. The `image` job then builds from the tag and pushes a `linux/amd64` and `linux/arm64` image tagged with the version and `latest`.
4. Run the smoke test against the published artifacts: `pnpm smoke -- npx -y better-caprover-mcp` and `pnpm smoke -- docker run -i --rm ghcr.io/guilhermebkel/better-caprover-mcp:latest`.

If a run fails after the tag is pushed, run it again with `none`: it sees the tag, skips the commit and the push, skips `npm publish` when the version is on npm already, and skips a GitHub Release that exists.

A bad release is not deleted: release the next patch. `npm deprecate` marks the bad one.

## What the checks guard

- `pnpm check:pack`: the package holds only `dist/`, `package.json`, `LICENSE` and `README.md`, is under 5 MB, and npm did not correct the manifest.
- `pnpm check:licenses`: every package that the bundle reads has an allowed license. The dependencies are `devDependencies` bundled into `dist/main.js`, so the check follows what the bundler read and not the `dependencies` field.
