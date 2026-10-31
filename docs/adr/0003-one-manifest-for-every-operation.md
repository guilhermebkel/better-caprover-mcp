# One manifest feeds every surface

Every CapRover operation is declared once, with its name, strict input schema, risk tier and description. The `tools` surface, the `code` surface, the policy and the drift check read that list and nothing else.

## Considered options

- Declaring each surface's tools by hand: rejected. The two surfaces would drift, and a rule applied to one would be forgotten in the other.

## Consequences

- A test fails when a public method of the CapRover SDK is neither an operation nor in the list of exclusions, so an SDK update cannot add an unreviewed capability.
- The generic call of the SDK (`executeGenericApiCommand`) is not an operation: it would bypass the mode.
- Planned: the manifest arrives with the first operation.
