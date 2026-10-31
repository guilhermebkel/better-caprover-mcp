export class HttpBindForbiddenError extends Error {
  static readonly MESSAGE = "Refusing to bind HTTP on a non-local address without authentication. "
    + "Set CAPROVER_MCP_HTTP_TOKEN to the bearer secret clients must send.";

  constructor() {
    super(HttpBindForbiddenError.MESSAGE);
    this.name = "HttpBindForbiddenError";
  }
}
