export class HttpBindForbiddenError extends Error {
  constructor() {
    super(
      "Refusing to bind HTTP on a non-local address without authentication. "
      + "Set CAPROVER_MCP_HTTP_TOKENS to a JSON object of client names to bearer secrets.",
    );
    this.name = "HttpBindForbiddenError";
  }
}
