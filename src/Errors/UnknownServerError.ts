export class UnknownServerError extends Error {
  constructor(requested: string | undefined, validNames: readonly string[]) {
    const names = validNames.length === 0 ? "none configured" : validNames.join(", ");
    const label = requested === undefined
      ? "Missing required parameter `server_name`."
      : "Unknown server name.";
    const nextStep = requested === undefined
      ? `Call the tool again with \`server_name\` set to one of: ${names}.`
      : `Use one of these configured names: ${names}.`;
    super(`${label} ${nextStep}`);
    this.name = "UnknownServerError";
  }
}
