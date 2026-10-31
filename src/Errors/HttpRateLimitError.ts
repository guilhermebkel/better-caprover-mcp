export class HttpRateLimitError extends Error {
  constructor() {
    super("Too many HTTP requests. Wait a moment, then try again.");
    this.name = "HttpRateLimitError";
  }
}
