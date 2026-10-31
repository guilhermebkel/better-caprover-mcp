# The server logs in with the password only

CapRover has one admin password and no user name. Its optional two-factor login adds an `otpToken` to the login call. This server does not support it: it logs in with `CAPROVER_URL` and `CAPROVER_PASSWORD`, nothing else.

## Decision

- If the server answers the login with `STATUS_ERROR_OTP_REQUIRED` (1114), this server stops at startup with a message that names the cause: two-factor login is on and is not supported.
- When the session token (valid for 480 hours) expires, the server logs in again with the password.

## Considered options

- Support the code as an option: rejected. The code lasts 30 seconds and a client starts this server again in every session, so a code cannot live in an environment variable. A token file or a TOTP secret next to the password would be needed, and the secret weakens the second factor.
- Rely on it for safety: rejected. CapRover checks the code through `pro.caprover.com`, so the feature belongs to the Pro plan, and most people who run this server will not have it. The modes of this server are the safety (ADR 0005).

## Consequences

- A CapRover server with two-factor login on cannot be used with this server. The README says so.
- Open: whether the operation that turns two-factor login on (`setOtpStatus`) is exposed. Turning it on would lock this server out of the CapRover it operates.
