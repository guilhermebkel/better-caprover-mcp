# Safety rules live in code, not in a description

The access mode, the risk tier, the confirmation of destructive calls, the unlock of critical operations and the masking of secrets are enforced by services and operations, each with a test. A description or a prompt may repeat them as a limit, but never carries them alone.

## Considered options

- Trusting the model to ask before a destructive call: rejected. A log, an app name or a variable can carry text that talks to the model.
- Trusting MCP annotations: rejected. They are hints for the client, not a guarantee.

## Consequences

- The server starts in `readonly`; an operation outside the mode is not registered, so it does not appear in the list.
- `user_confirmed` makes the model show what a destructive call would do; it does not stop a manipulated model. The barriers are the mode and, where the client supports it, the interactive confirmation. In the `code` surface a destructive call without it is refused.
- The CapRover password gives full access, so the modes are enforced by this server and not by CapRover. The README says so.
