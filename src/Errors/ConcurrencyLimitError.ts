export class ConcurrencyLimitError extends Error {
  constructor(serverName: string, limit: number) {
    super(
      `Too many concurrent calls for server "${serverName}" (limit ${limit}). `
      + "Wait for other calls to finish, then try again.",
    );
    this.name = "ConcurrencyLimitError";
  }
}
