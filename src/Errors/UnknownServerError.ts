export class UnknownServerError extends Error {
  constructor(requested: string | undefined, validNames: readonly string[]) {
    const hint = validNames.length === 0 ? "No CapRover server is configured." : `Valid server names: ${validNames.join(", ")}.`;
    const label = requested === undefined ? "Missing required parameter `server`." : `Unknown server "${requested}".`;
    super(`${label} ${hint}`);
    this.name = "UnknownServerError";
  }
}
