export class ConcurrencyLimitError extends Error {
  constructor(limit: number) {
    super(
      `Too many concurrent tool calls (limit ${limit}). `
      + "Wait for other calls to finish, then try again.",
    );
    this.name = "ConcurrencyLimitError";
  }
}
