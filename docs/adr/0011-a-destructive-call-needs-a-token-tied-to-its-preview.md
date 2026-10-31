# A destructive call needs a token tied to its preview

A destructive operation does nothing on its first call. It returns what it would do and a `confirmation_token`. It runs only when called again with `user_confirmed: true` and that token.

## Decision

- The token is bound to a fingerprint: a SHA-256 of the operation name and its inputs, without `dry_run`, `user_confirmed` and `confirmation_token`. The same call with other inputs gets a new preview.
- A token works once and expires after 5 minutes. `ConfirmationService` keeps tokens in memory, with the clock as an input, so a test does not wait.
- `user_confirmed: true` without a valid token is an error result that carries a new preview and a new token.
- `dry_run` on a destructive operation returns the preview and no token.

## Considered options

- A `user_confirmed` flag alone: rejected. A model sets a flag as easily as it sets any parameter, and the flag proves nothing about the preview.
- A token that is signed and carries its own expiry, with no memory: rejected for now. Over **stdio**, one process per client; over **HTTP** ([ADR 0013](0013-remote-http-transport.md)), one process holds tokens for all sessions, which share one bearer secret. Memory still suffices, a token is bound to its preview not a session, and a restart cancels all tokens, which is the safe side.
- Asking the person through the client (elicitation) instead of the token: rejected. Not every client supports it, so it adds to the token and does not replace it. It is now added: see "Elicitation" below.

## Consequences

- The token makes the model show the person what will be lost. It does not stop a manipulated model that shows nothing and calls twice. The barriers are the access mode and, later, elicitation (ADR 0005).
- A destructive call is two calls, and a test covers both: no token, a used token, a token of another call, an expired token.

## Elicitation

- Applies to destructive and critical operations. It runs after the token was accepted and before the call: the server sends an MCP elicitation request with the preview and a yes or no.
- It is used only when the client declared the `elicitation` capability. Otherwise the token flow is the only gate, as before.
- A decline, a cancel and a failed request all stop the call with a result that says the person declined and that nothing changed. The token is spent, so a new preview is needed to try again.
- `get_access` reports whether the client can be asked.
- It does not replace the token: a client that supports elicitation still gets the preview and the token first, so the model has shown the person what will change before the question arrives.
