import { ConcurrencyLimitError } from "@/Errors/ConcurrencyLimitError.ts";

const DEFAULT_WAIT_MS = 30_000;

type Waiter = {
  resolve: () => void;
  reject: (error: Error) => void;
};

type ServerLimiter = {
  limit: number;
  active: number;
  waiters: Waiter[];
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
    const limiter = this.getLimiter(serverName);
    if (limiter.active < limiter.limit) {
      limiter.active += 1;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        resolve: () => {
          limiter.active += 1;
          resolve();
        },
        reject,
      };
      limiter.waiters.push(waiter);
      setTimeout(() => {
        const index = limiter.waiters.indexOf(waiter);
        if (index === -1) {
          return;
        }
        limiter.waiters.splice(index, 1);
        reject(new ConcurrencyLimitError(serverName, this.maxConcurrent));
      }, DEFAULT_WAIT_MS);
    });
  }

  private release(serverName: string): void {
    const limiter = this.getLimiter(serverName);
    limiter.active = Math.max(0, limiter.active - 1);
    const next = limiter.waiters.shift();
    if (next !== undefined) {
      next.resolve();
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
