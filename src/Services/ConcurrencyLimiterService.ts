import type { ConcurrencyLimiterWaiter } from "@/Protocols/ConcurrencyLimiterProtocol.ts";
import { ConcurrencyLimitError } from "@/Errors/ConcurrencyLimitError.ts";

const DEFAULT_WAIT_MS = 30_000;

export class ConcurrencyLimiterService {
  private active = 0;
  private readonly waiters: ConcurrencyLimiterWaiter[] = [];

  constructor(
    private readonly maxConcurrent: number,
    private readonly queueWaitMs = DEFAULT_WAIT_MS,
  ) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active += 1;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const waiter: ConcurrencyLimiterWaiter = {
        resolve: () => {
          this.active += 1;
          resolve();
        },
        reject,
      };
      this.waiters.push(waiter);
      setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index === -1) {
          return;
        }
        this.waiters.splice(index, 1);
        reject(new ConcurrencyLimitError(this.maxConcurrent));
      }, this.queueWaitMs);
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    if (next !== undefined) {
      next.resolve();
    }
  }
}
