export class ToolFailureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolFailureError";
  }
}
