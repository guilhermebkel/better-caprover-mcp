## What and why

<!-- One or two sentences. -->

## Linked issue

<!-- Closes #123. One pull request closes one issue. -->

## How I tested it

<!-- `pnpm check:changed` is the minimum; CI runs the full `pnpm check`. If you touched how the server starts, say which way you ran it: node, npx or docker run -i. -->

- [ ] The acceptance criteria of the issue are met
- [ ] `pnpm check:changed` passes
- [ ] New behavior has a test next to the file it tests
- [ ] New output paths are redacted and tested with a fake secret
- [ ] A new operation follows "Before merging an operation" in `docs/mcp-standards.md`: tier, annotations, `dry_run` or `user_confirmed`, description
- [ ] The README and the site were reviewed when an operation was added or removed (`pnpm check:operation-docs` checks names and numbers; the wording is review only)

## Checklist

- [ ] No password, token, server address or app content anywhere in the diff
- [ ] Docs, `GLOSSARY.md` or an ADR updated if behavior or vocabulary changed
- [ ] If packaging changed, `pnpm smoke` passes through `npx` and through `docker run -i`
