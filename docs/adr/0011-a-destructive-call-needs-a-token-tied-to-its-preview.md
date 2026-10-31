# A destructive call needs a token tied to its preview

A destructive operation does nothing on its first call. It returns what it would do and a `confirmation_token`. It runs only when called again with `user_confirmed: true` and that token.

## Decision

- The token is bound to a fingerprint: a SHA-256 of the operation name and its inputs, without `dry_run`, `user_confirmed` and `confirmation_token`. The same call with other inputs gets a new preview.
- A token works once and expires after 5 minutes. `ConfirmationService` keeps tokens in memory, with the clock as an input, so a test does not wait.
- `user_confirmed: true` without a valid token is an error result that carries a new preview and a new token.
- `dry_run` on a destructive operation returns the preview and no token.

## Considered options

- A `user_confirmed` flag alone: rejected. A model sets a flag as easily as it sets any parameter, and the flag proves nothing about the preview.
- A token that is signed and carries its own expiry, with no memory: rejected for now. Over **stdio**, one process per client; over **HTTP** ([ADR 0013](0013-remote-http-transport-and-multi-server.md)), one process holds tokens for all sessions, which share one bearer secret. Memory still suffices, a token is bound to its preview not a session, and a restart cancels all tokens, which is the safe side.
- Asking the person through the client (elicitation): kept for later. Not every client supports it, so it adds to the token and does not replace it.

## Consequences

- The token makes the model show the person what will be lost. It does not stop a manipulated model that shows nothing and calls twice. The barriers are the access mode and, later, elicitation (ADR 0005).
- A destructive call is two calls, and a test covers both: no token, a used token, a token of another call, an expired token.
