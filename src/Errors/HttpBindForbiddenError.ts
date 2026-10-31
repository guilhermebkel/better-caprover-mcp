export class HttpBindForbiddenError extends Error {
  constructor() {
    super(
      "Refusing to bind HTTP on a non-local address without authentication. "
      + "Set CAPROVER_MCP_HTTP_TOKEN to the bearer secret clients must send.",
    );
    this.name = "HttpBindForbiddenError";
  }
}
