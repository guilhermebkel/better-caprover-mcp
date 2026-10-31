# MCP standards

How the operations of this server are designed. `pnpm lint` enforces the rules marked **(lint)**, `pnpm test` the ones marked **(test)**; the rest are checked in review. A rule marked **(planned)** has no tool yet: until then it is a review rule. Each rule is one line. An operation is read by a model that cannot ask a question, so the contract is the schema, the description, the response and the error. The reasons are in `docs/adr/0008-descriptions-may-name-neighbor-operations.md`.

## Scope

- **One operation per thing a person does (review).** An operation is a task, not a copy of an endpoint, unless the endpoint is already the task.
- **A sequence always run together is one operation (review).** `diagnoseApp`, `findIssues`, `redeployProject` and `bulkEnvUpdate` exist because the agent would otherwise call the same three reads in a row.
- **Filtering, aggregation and ranking happen in the server (review).** A list operation takes `fields`, `filter` and `limit`; it never returns everything for the model to sift.
- **Names are a verb and an object, and the surface name is derived (test).** The class `NAME` is camelCase (`listApps`); `OperationBuilderUtil` derives the tool name (`list_apps`); a test fails when two operations collapse to the same tool name.
- **No service prefix (review).** The client already shows the server name; a prefix costs tokens in every turn.

## Input

- **Schemas are strict and every field is described (lint, planned: `local/strict-input-schema`).** No extra properties; a field with a wrong name fails instead of being ignored.
- **A parameter name says the kind of value (lint, planned: `local/no-vague-field-name`).** `app_name`, `registry_id`, `image_name`, `job_id`; never `id`, `name`, `input` or `data`.
- **A closed set is an enum; a format has a pattern or an example (review).** A number is an integer with `minimum` and `maximum`, and its unit is in the name.
- **A field description says where the value comes from when another operation produces it (review).** "An app name as returned by `list_apps`".
- **An optional field is omitted by default and never defaults to a sentinel string (test).** A schema walk fails on a default of `"undefined"`, `"null"` or `""`; absence means no filter.
- **A patch field has three states, written in its description (review).** Omitted keeps the value, `null` clears it, a value sets it.
- **A nested structure has a compact form the model already knows (test).** Environment variables are dotenv text (`KEY=value` per line), volumes are `name:/path`, ports are `host:container`; the server parses them and an error quotes the bad line.
- **An identifier accepts the forms people paste (review).** An app name or the app's URL.
- **Limits live in the schema (test).** Batches have `maxItems` (20 at most), lists have `limit` (200 at most), log reads have `lines` (500 at most).

## Writes

- **An edit is a small named operation, never a re-sent definition (review).** Apps change through `patchAppDefinition`; `updateConfigAndSave` re-sends the whole definition, so it is offered only in the `code` surface, with a warning in its description.
- **Every write has `dry_run` and returns the resulting state or the operation to read it (test).** A `dry_run` call makes no write call on the client. A write implements `describeChange` to say what it would do.
- **A batch stops at the first failure and returns `applied` and `notApplied` (test).** CapRover has no transactions, so a batch is never called atomic.
- **Create and publish are different operations (review).** `createApp` does not deploy.
- **A side effect is a parameter with a safe default (test).** `deleteVolumes` is `false` unless set.

## Risk and confirmation

- **Every operation declares one tier: `read`, `write`, `destructive` or `critical` (lint, planned: `local/operation-metadata`).** The mode decides which tiers are registered (snapshot test).
- **MCP annotations follow the tier (lint, planned: `local/operation-metadata`).** `read`: `readOnlyHint` true, `idempotentHint` true. `write`: `readOnlyHint` false, `destructiveHint` false. `destructive` and `critical`: `destructiveHint` true. `openWorldHint` is false for all, because the server talks to one configured CapRover. Annotations are hints for the client, never the security.
- **A destructive operation takes `user_confirmed`, default `false` (test).** Without it nothing changes; the response lists what would happen and carries a `confirmation_token` tied to that preview. With `user_confirmed: true` and the token it runs.
- **The flag makes the model show the list; it does not stop a manipulated model (review).** The barriers are the mode and, where the client supports elicitation, the interactive confirmation. In the `code` surface a destructive call without elicitation is refused (test).
- **A critical operation also needs `CAPROVER_MCP_ALLOW_CRITICAL=1` (test).** Two SDK methods are not operations: the generic API call (it would bypass the mode) and the one that turns two-factor login on (it would lock this server out). `pnpm sdk:drift` fails when an SDK method is not classified.
- **A destructive description says it runs only when the user asked, never to tidy up, and says what cannot be undone (review).**

## Descriptions

- **Order: what it does; when to use it; when not to and which neighbor to use; what it returns and what it returns when empty; limits and side effects (review).** One sentence each.
- **A description opens with the nature of the action (test).** A `read` operation starts with "Read-only."
- **A description has a length limit, set at today's worst case (test).** Long specifications go to a guide topic.
- **Rules that span operations live in the server `instructions`, once (review).** The meaning of the modes, the usual order of calls.
- **A description may name a neighbor operation to route or to say where a value comes from, never to prescribe the order of a flow (review).** This differs from the standard of the project this harness comes from, on purpose (ADR 0008).
- **Return fields have self-explanatory names (review).** A long legend of abbreviations in a description is paid in every turn.

## Responses

- **Concise by default (review).** List and get operations take `response_format`: `concise` or `detailed`.
- **A truncated result says so and says how to get the rest (test).** `truncated: true` plus the parameter to use.
- **Numbers are numbers, with the unit in the field name (review).** `sizeBytes`, not "1.2 GB".
- **A secret never leaves (test).** Environment variable reads return the key and `isSet`; every output path is tested with a fake secret.
- **Logs are data, not instructions (test).** The last N lines, secrets redacted, `truncated` marked.
- **A result is structured (review).** `structuredContent` carries the data. The text content carries the summary and the same data as JSON, because some clients show only the text to the model. `outputSchema` is *planned*.

## Errors

- **A failed execution is a result with `isError: true` (test).** It names what failed, why, and what to do next; protocol errors are only for an unknown operation or invalid arguments.
- **An invalid value comes back with the valid ones (test).** An unknown app returns the closest names; an unknown registry returns the list.
- **An error message has no stack trace and no secret (test).**
- **A feature the CapRover version or plan lacks is dropped with a warning when harmless, and is an error naming the requirement otherwise (review).**

## Documentation on demand

- **A `guide` operation serves topics, also as resources `caprover://docs/<topic>` (test).** Topics: `modes`, `code-mode`, `app-definition`, `env-vars`, `deploy`, `errors`. Every topic named anywhere exists.
- **Every error code has a guide topic (test).** The error says which one to read.
- **Three layers (review).** The description says when to use the operation; the guide says how to write the input; the error says how to fix this call.
- **A guide item has a purpose line, the syntax, accepted values by type, restrictions, examples and one wrong example marked BAD (review).**

## Long operations and access

- **A long operation returns a job id and has its own progress operation (review).** `deployOneClick` and `getOneClickDeployProgress`; the description says what a finished status does not prove.
- **`getAccess` reports the mode, the enabled tiers, whether critical is unlocked, the surface, the toolsets, whether elicitation is available, the CapRover version and the Pro state (test).** It is optional; every operation also enforces its limits and says so.
- **No telemetry and no commercial suggestions (review).**

## Code mode

- **The `code` surface registers only `search` and `execute` (test).** `search` never calls the API; `execute` is the only caller.
- **Credentials never enter the sandbox (test).** No network, no files, no modules, only `caprover.*`, with limits on memory, stack, time, calls and output; a new sandbox for every call.
- **A call from a script goes through the same policy as a named operation (test).** Same mode, tier and confirmation; a parity test runs the same cases through both surfaces.
- **A script error returns the line and message, never host internals (test).**

## Before merging an operation

- Does the operation do a task, and not only mirror an endpoint?
- Is the schema strict, every field described, every value kind in its name?
- Is the tier declared, and do the annotations match it?
- Does a write have `dry_run`, and a destructive one `user_confirmed`?
- Does the description follow the order and fit the length limit?
- Is the response short, with numbers as numbers and no secret?
- Does an invalid input return the valid values?
- Was it tried in a task that needs several calls, and was the transcript read?
