# The CapRover SDK sits behind an adapter

`caprover-api` (the official TypeScript SDK, ISC) is imported in `src/Adapters/CapRover/` only. The rest of the code depends on a `CaproverClient` contract that the adapter implements.

## Considered options

- Using the SDK everywhere: rejected. The SDK is marked experimental and offers no guarantee of compatibility; one adapter turns its change into a one-folder fix.
- Writing our own HTTP client: rejected for now. The SDK already covers login, two-factor codes and every route; direct HTTP stays an option for a call it lacks.

## Consequences

- A lint rule forbids importing `caprover-api` anywhere else.
- Tests use recorded CapRover responses in the real format, and a real CapRover in Docker covers what a double cannot.
- Planned: the adapter arrives with the first operation.
