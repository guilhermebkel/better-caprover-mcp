export class HttpBadJsonError extends Error {
  constructor() {
    super("HTTP request body is not valid JSON.");
    this.name = "HttpBadJsonError";
  }
}
