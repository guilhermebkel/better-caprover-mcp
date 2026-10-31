export interface ConfirmationServicePort {
  createToken(fingerprint: string): string;
  consumeToken(token: string, fingerprint: string): boolean;
}

export interface ConcurrencyLimiterServicePort { run<T>(task: () => Promise<T>): Promise<T> }
