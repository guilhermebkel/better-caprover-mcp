# Docs standards

What goes in `docs/` and where everything else goes.

## Two kinds of file, and product docs apart

- **Standard.** A rule that applies to every file of its kind. Each rule is one line a reviewer or a tool can answer yes or no, tagged with how it is checked. The file is `docs/<topic>-standards.md`. Harness changes follow `docs/harness-standards.md`.
- **Guide.** How to do a recurring job. A guide is listed in the table below. There is none yet.
- **Product doc.** What the server does or how a part of it is operated. It lives in `docs/product/`, never beside the standards, so it is not read as one.

`docs/adr/` and `docs/agents/` keep their own rules and are not classified here.

| File | Kind |
| --- | --- |
| `docs/product/adding-an-operation.md` | product doc |

## What a standard never contains

- An operation, class, constant or message as the rule. An example may name one, as an example: inside a fenced block, or on a line that says "e.g." or "example".
- A description of the product. The product and its terms are in `GLOSSARY.md`.

Test for a new line: **would it stay true if the operation, class or message it mentions were renamed or deleted?** If not, it does not go in a standard.

## Where the other content goes

- What the product does, and its terms: `GLOSSARY.md`.
- Why a choice was made: `docs/adr/`.
- How one operation behaves: the code and its tests; if it needs prose, a note in `docs/product/`.
- A rule a tool can check is a tool (`docs/code-standards.md`); the standard then says which tool and keeps the line.
