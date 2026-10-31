import { describe, expect, it } from "vitest";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";

const SERVER_NAME = "prod";
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
    const first = limiter.run(SERVER_NAME, async () => {
      events.push(FIRST_START);
      await blockA;
      events.push("first-end");
    });
    const second = limiter.run(SERVER_NAME, async () => {
      events.push(SECOND_START);
      await blockB;
      events.push("second-end");
    });
    const third = limiter.run(SERVER_NAME, () => {
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
});
