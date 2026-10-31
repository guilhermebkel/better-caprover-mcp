import { describe, expect, it, vi } from "vitest";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";

const FIRST_START = "first-start";
const SECOND_START = "second-start";

describe("ConcurrencyLimiterService.run()", () => {
  it("never runs more tasks at once than the configured limit", async () => {
    const limiter = new ConcurrencyLimiterService(2);
    const events: string[] = [];
    let releaseA = (): void => undefined;
    let releaseB = (): void => undefined;
    const blockA = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    const blockB = new Promise<void>((resolve) => {
      releaseB = resolve;
    });
    const first = limiter.run(async () => {
      events.push(FIRST_START);
      await blockA;
      events.push("first-end");
    });
    const second = limiter.run(async () => {
      events.push(SECOND_START);
      await blockB;
      events.push("second-end");
    });
    const third = limiter.run(() => {
      events.push("third-start");
      return Promise.resolve();
    });
    await Promise.resolve();
    expect(events).toStrictEqual([FIRST_START, SECOND_START]);
    releaseA();
    releaseB();
    await Promise.all([first, second, third]);
    expect(events).toStrictEqual([FIRST_START, SECOND_START, "first-end", "second-end", "third-start"]);
  });

  it("leaves no timer behind once a waiting task has started", async () => {
    vi.useFakeTimers();
    try {
      const limiter = new ConcurrencyLimiterService(1, 1000);
      const first = limiter.run(() => Promise.resolve("a"));
      const second = limiter.run(() => Promise.resolve("b"));
      await Promise.all([first, second]);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
