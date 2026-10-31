# Harness standards

The harness is `AGENTS.md`, the standards docs, lint rules, check scripts, `package.json` commands, templates (pull request and issue), and `docs/agents/`.

How to change it: each rule is one line; **(review)** is answered in review. Operations and everything the model reads follow `docs/mcp-standards.md` and `docs/prompt-standards.md`, not this file.

**A tool before a sentence (review).** A new pattern is enforced by a type, a lint rule or a script first; it becomes a line of text only when no tool can express it. e.g. `pnpm check` runs `scripts/ensure-deps.mjs` first, instead of telling agents to run `pnpm install` by hand.

**What `pnpm check:operation-docs` checks (script) and what stays review.** The script reads the operations in `src/Operations/` and fails when `README.md`, `AGENTS.md`, `site/index.html` or `site/llms.txt` state a wrong total, or the page a wrong count of critical operations (marker comments `<!-- operations:count -->` in the README and `<!-- operations:count|critical -->` in the page, the number before "operations" in `AGENTS.md` and `llms.txt`; the other numbers in the README were removed, so none can go stale), when the README operations table lacks an operation or names one that does not exist, or when the tools section of the page names one that does not exist (the page may show only the main operations). The description of each operation, the order and the prose around the numbers are review only.

## Classes and where the fix goes

Each finding is exactly one class; the class picks the fix.

| Class | When | Fix |
| --- | --- | --- |
| Rule ignored | The harness already says it and the agent still does the opposite | A check; never more text |
| Partial or outdated | The rule exists but is incomplete, ambiguous or false today | Fix the line where it lives |
| Missing | Nothing covers it | Add it in the piece that does the work, not in `AGENTS.md`, unless it applies to every session |
| Structure change | A request repeats (a skill), a fixed sequence is rediscovered (a script), a piece is never used (remove it), a large always-loaded piece is needed only sometimes (split it) | Change the structure, not a longer rule |
| Out of scope | The cause is outside the harness (a product tool or service) | A recommendation only |
| Already handled | An open issue or pull request covers it | Listed with its number; not suggested again |

- **Placement order (review).** Take the first of these that can express the rule: a type or compiler option; a lint rule (built-in, then local in `scripts/eslint-local-rules.mjs` with its test), set at today's worst case when it is a limit; a script or test that `pnpm check` runs; a template or checklist; a line in `AGENTS.md` or a standards doc marked **(review)** with the reason no tool can check it; an ADR when it is a decision with a cost.
- **Cheapest adequate fix (review).** Delete or tighten before adding. A script before a longer prompt. Rarely needed detail out of `AGENTS.md`.
- **Conflict is a finding (review).** Two rules for the same thing are fixed by keeping the one where the work is done and removing the other. A piece that works only because another says something specific is coupling, and also a finding.
