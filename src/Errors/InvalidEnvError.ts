export class InvalidEnvError extends Error {
  constructor(details: string) {
    super(`Invalid environment: ${details}`);
    this.name = "InvalidEnvError";
  }
}
