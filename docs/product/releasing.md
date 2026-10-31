# Releasing

A release publishes the npm package `better-caprover-mcp` and the image `ghcr.io/guilhermebkel/better-caprover-mcp`, both from one git tag. The workflow is `.github/workflows/release.yml`.

## One time

1. Create an npm access token that can publish this package (type "Automation") and save it as the repository secret `NPM_TOKEN`.
2. The image needs no secret: the workflow pushes it with the `GITHUB_TOKEN`. After the first push, open the package page on GitHub and make it public, so `docker run` works without login.

## Each release

1. On `main` with a green CI, set the new version: `npm version minor --no-git-tag-version` (or `patch`), commit it, and merge it.
2. Tag the merge commit with the same number and push the tag: `git tag v0.1.0 && git push origin v0.1.0`.
3. The workflow checks that the tag equals the version in `package.json`, runs `pnpm check`, and publishes the package with provenance and a multi-architecture image (`linux/amd64`, `linux/arm64`) tagged with the version and `latest`.
4. Run the smoke test against the published artifacts: `pnpm smoke -- npx -y better-caprover-mcp` and `pnpm smoke -- docker run -i --rm ghcr.io/guilhermebkel/better-caprover-mcp:latest`.

A bad release is not deleted: publish the next patch version. `npm deprecate` marks the bad one.
