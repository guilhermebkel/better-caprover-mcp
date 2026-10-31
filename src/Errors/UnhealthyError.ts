export class UnhealthyError extends Error {
  constructor() {
    super("HTTP mode is active but GET /health did not answer ok.");
    this.name = "UnhealthyError";
  }
}
