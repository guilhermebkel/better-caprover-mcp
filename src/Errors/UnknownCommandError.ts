export class UnknownCommandError extends Error {
  constructor(command: string) {
    super(`Unknown command "${command}". Run without arguments to start the MCP server, or use "init" or "serve --http".`);
    this.name = "UnknownCommandError";
  }
}
