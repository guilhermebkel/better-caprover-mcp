import { ConcurrencyLimitError } from "@/Errors/ConcurrencyLimitError.ts";

const DEFAULT_WAIT_MS = 30_000;
const POLL_MS = 10;

type ServerLimiter = {
  limit: number;
  active: number;
  waiters: (() => void)[];
};

export class ConcurrencyLimiterService {
  private readonly serverNameToLimiter = new Map<string, ServerLimiter>();

  constructor(private readonly maxConcurrent: number) {}

  async run<T>(serverName: string, task: () => Promise<T>): Promise<T> {
    await this.acquire(serverName);
    try {
      return await task();
    } finally {
      this.release(serverName);
    }
  }

  private async acquire(serverName: string): Promise<void> {
    const deadlineMs = Date.now() + DEFAULT_WAIT_MS;
    while (Date.now() < deadlineMs) {
      const limiter = this.getLimiter(serverName);
      if (limiter.active < limiter.limit) {
        limiter.active += 1;
        return;
      }
      await new Promise<void>((resolve) => {
        limiter.waiters.push(resolve);
        setTimeout(resolve, POLL_MS);
      });
    }
    throw new ConcurrencyLimitError(serverName, this.maxConcurrent);
  }

  private release(serverName: string): void {
    const limiter = this.getLimiter(serverName);
    limiter.active = Math.max(0, limiter.active - 1);
    const next = limiter.waiters.shift();
    if (next !== undefined) {
      next();
    }
  }

  private getLimiter(serverName: string): ServerLimiter {
    const existing = this.serverNameToLimiter.get(serverName);
    if (existing !== undefined) {
      return existing;
    }
    const created: ServerLimiter = { limit: this.maxConcurrent, active: 0, waiters: [] };
    this.serverNameToLimiter.set(serverName, created);
    return created;
  }
}
