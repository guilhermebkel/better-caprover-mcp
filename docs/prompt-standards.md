# Prompt standards

How everything the model reads from this server is written. `pnpm test` enforces the rules marked **(test)**; the rest are checked in review. These texts are code: they have owners, tests and a review, like any other file. How an operation is designed is in `docs/mcp-standards.md`; this file is about the words.

## What counts as a prompt asset

- The server `instructions`.
- The description of every operation and of every field of its input schema (`.describe()` in the Zod schema).
- Every guide topic served by the `guide` operation.
- Error and refusal messages that go back to the model.

## Each asset stands alone

A prompt asset is read alone, at a different moment, often by a model that has not seen the others. So each one is **self-contained** (it makes sense without opening another), **modular** (it does one job) and **independent** (changing another asset does not break it).

- **A description says what its own operation takes and gives.** It may name a neighbor operation to route ("to list apps, use `list_apps`") or to say where a value comes from ("an app name as returned by `list_apps`"). It never prescribes the order of a flow: that lives in the server `instructions`.
- **A description does not point to a guide topic or a file.** The error that needs a topic names it.
- **A guide topic does not point to another topic or to an ADR.** It may list related topics by name under "See also".
- **The instructions name operations, never their parameters.** The parameters and their values are in the schema descriptions.

**(test)** A test checks that every operation named in an asset exists, that a description names no guide topic or file, and that a guide topic names no ADR.

## One home for each rule

A rule is written once. Where it is needed elsewhere, the other asset says nothing, or says it in other words about its own part.

| Rule is about | Home |
| --- | --- |
| What the server is, what the modes mean, the usual order of calls, what it never does | The server `instructions` |
| When to use an operation, when not to, what it returns, its limits and side effects | The operation description |
| What a field value means, its format and where it comes from | The field description in the Zod schema. No regex or word list over free text next to the schema |
| How to write a structure (environment variables, volumes, the app definition) | A guide topic |
| How to fix this call | The error message |
| A rule that must hold | Code with a test. A description may repeat it as a limit so the model does not try |

**(test)** A test fails when a sentence of 12 or more words appears in two of these assets. It does not see a rule said in other words, so review catches those.

## English only

Every prompt asset is in English, and so are the messages that come back to the model. The reply to the person is in the person's language: that is the client's job, not the server's.

## How to write

Adapted from the ASD-STE100 rules (Simplified Technical English), made for readers that cannot ask a question: they choose one reading. Follow them about 80%: break a rule when following it removes something useful (the reason for an instruction, an example, a domain term the model knows better than a paraphrase). The goal is one reading, not a text that looks like a standard.

**Do not change what the text orders.** A rewrite never adds, removes or weakens an instruction. "Never" does not become "avoid". If something important is missing, suggest it apart from the rewrite.

### Words

- One term per concept, from start to end. If it is an "app", it is never also a "service" or an "application".
- Use `GLOSSARY.md` terms and exact names for exact things, in code format: `list_apps`, not "the listing tool".
- A number instead of a vague word: "up to 20 apps", not "a few".
- No subjective word without a criterion: "relevant", "adequate". Say what makes it so.

### Sentences

- One instruction per sentence. Two actions joined by "and" become two sentences, unless they are one step.
- Subject, verb and object are explicit. No ellipsis.
- Imperative: "Read the logs", not "It would be useful to consider reading".
- The condition comes before the action: "If the app does not exist, say so".
- Say what to do, not only what to avoid. If the prohibition matters, keep it and add the alternative.
- Keep a sentence to about 20 words in an instruction and 25 in an explanation.

### Structure

- State which rule wins when two can conflict.
- Give the reason of an important rule in one sentence.
- Mark an example as an example (a block, a label). An unmarked example becomes a model to copy.
- Use emphasis for one or two rules.
- Handle the obvious edge case: an empty list, a missing field, a failed call.

### Format by kind of text

- **Operation description.** In this order, one sentence each: what it does (verb and object); when to use it; when not to, and which neighbor to use; what it returns and what it returns when it finds nothing; limits and side effects (whether it changes data, whether it cannot be undone). A read operation starts with "Read-only."
- **Field description.** The exact format ("an app name as returned by `list_apps`"), the allowed values or range, the default and what happens if the field is missing, and one short example when the format is not obvious.
- **Message back to the model.** What failed (the exact name), why if known, and what to do next: try again, change a field, or stop and tell the person.

## Before you merge

- Does each asset make sense read alone?
- Is each rule written once, in its home?
- Is every instruction of the old text still in the new one, with the same strength?
- Does any concept have two names?
- Does any sentence carry two instructions or pass 25 words?
- Was the transcript of a real task read, to see where the model stumbled?
