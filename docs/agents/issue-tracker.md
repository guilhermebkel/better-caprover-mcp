# Issue tracker: GitHub

Issues live as GitHub issues in `guilhermebkel/better-caprover-mcp`. Use the `gh` CLI: `gh issue view <n> --comments`, `gh issue list --json number,title,body,labels`, `gh issue comment`, `gh issue edit --add-label/--remove-label`, `gh issue close`. Infer the repo from `git remote -v`.

In Claude Code sessions `gh issue create` and some `gh issue` commands fail with "GraphQL is not available". Use the REST API instead: `gh api repos/guilhermebkel/better-caprover-mcp/issues -f title=... -f body=... -f 'labels[]=task'`, and `gh api repos/guilhermebkel/better-caprover-mcp/issues/<n>/comments -f body=...`.

## Issue types

Each type has a form in `.github/ISSUE_TEMPLATE/` (blank issues are off). The forms only show up in the web UI; when you create an issue from the CLI, copy the same headings.

| Type | Label | Use it for |
| --- | --- | --- |
| Task | `task` | A piece of work written as a spec. The default. One task is one pull request. |
| Bug | `bug` | Something that does not work as the product or the docs say. Say how the server runs (npx, Docker or a local build), the CapRover version and the access mode; paste the stderr lines of the server, with no password or token. |
| Idea | `enhancement` | Something to decide before it becomes a task. Triage rewrites it as a task or closes it. |

Area labels group tasks that touch the same part of the code: `area:operations`, `area:surfaces`, `area:sandbox`, `area:security`, `area:packaging`, `area:harness`, `area:docs`. Triage sets them.

A new issue gets the `needs-triage` label and one `area:*` label. It becomes `ready-for-agent` only when "Definition of ready" below is satisfied.

The issue templates in `.github/ISSUE_TEMPLATE/` appear only in the GitHub web UI. When you create or rewrite an issue from the CLI, copy the headings from "A task is a spec".

## A task is a spec

A bug becomes a spec too once its cause is known: triage rewrites it with these headings and keeps the `bug` label.

An agent that reads only the issue must be able to do it. Use these headings, in this order (the form produces them as `###`):

```
### Context
### Scope            (numbered checklist `S1`, `S2`…, in order of work)
### Out of scope     (what belongs to another issue, linked)
### Acceptance criteria   (numbered `AC1`…, `WHEN … THEN …`, edge cases marked `[edge]`)
### Tests            (what must be proven, by AC number; never the kind of test)
### Where to look    (files, ADRs, GLOSSARY terms, issues)
### Blocked by       (`#12, #15` or `none`)
### Needs input      (what only a person can give)
```

Rules for the text:

- English, like the code and the docs.
- No real passwords, tokens, server addresses or app content. Use invented data or the integration CapRover the issue names.
- Every scope item can be checked by someone else. "Improve" is not an item.
- Acceptance criteria are numbered and each is one observable behavior: `**AC1** WHEN <condition> THEN <result>`. Edge and error cases go in the same list, marked `[edge]`. They describe what a reviewer sees; Tests say what must be proven, by AC number where it helps.
- Tests list what must be proven: the AC numbers and the edge cases that need a proof, the data or fixtures to use, and what must not be called for real. They never name the kind of test (unit, component, end-to-end), a test file or a test tool: the agent picks the level of each test by "Which level" in `docs/test-standards.md`, and naming one in the issue pushes it off that rule. Wrong: "integration test for AC4". Right: "AC4: in readonly mode, a delete call changes nothing and says why." Only an issue whose subject is the test infrastructure itself may name levels.
- Scope says what to build, not which methods to write. Files and methods go in "Where to look".
- Scope items are numbered `S1`, `S2`…, so a pull request can say what it did and what it left for later.
- Name the files. "Where to look" saves the agent from searching the whole repository.
- Behavior that cannot fail (access modes, risk tiers, confirmation, secret masking) is in code with a test, never only in a prompt. Say so in the scope when it applies.

## Definition of ready

An issue gets `ready-for-agent` only when all of this is true:

- It has every heading above, with real content: numbered scope items and at least one numbered `WHEN … THEN …` criterion.
- `Blocked by` lists only open issues that really block it, and the others are closed.
- `Needs input` is empty. If a decision or content from a person is missing, label it `needs-info` or `ready-for-human`.
- It fits in one pull request. Otherwise split it and link the parts.
- Someone other than the author could check the acceptance criteria.
- Tests say what to prove and name no test level (except on an issue about the test infrastructure).

## Working an issue (for agents)

1. `gh issue view <n> --comments`. Read the whole issue, its linked ADRs, `GLOSSARY.md` and `AGENTS.md`.
2. Check `Blocked by`. If a blocker is open, stop and say so.
3. Branch from `main` as `<type>/<n>-short-slug`, where `<type>` is `feat`, `fix` or `chore` (`feat/12-short-slug` for issue 12). Assign yourself when you can.
4. Do the scope in order. Tick the checklist in the issue as items land.
5. Choose the level of each test by "Which level" in `docs/test-standards.md`. The issue says what to prove, not how; if the level is not obvious, say in the pull request which one you chose and why.
6. Open the pull request with `Closes #<n>` as the first line of the body and follow `.github/PULL_REQUEST_TEMPLATE.md`.
7. If the scope changed while you worked, edit the issue body so it matches what the pull request does.
8. If the spec is wrong or incomplete, comment on the issue with what you found and add `needs-info`. Do not guess a decision that is the person's.
9. Close nothing by hand. The merge closes the issue.

## Dependencies

Write them in the `Blocked by` field, and nowhere else as a hard rule. A soft relation ("also see #19") goes in `Where to look`.
