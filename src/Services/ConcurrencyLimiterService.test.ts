import { describe, expect, it } from "vitest";
import { ConcurrencyLimiterService } from "@/Services/ConcurrencyLimiterService.ts";

const HOLD_MS = 40;

describe("ConcurrencyLimiterService.run()", () => {
  it("never runs more tasks at once than the configured limit", async () => {
    const limiter = new ConcurrencyLimiterService(2);
    let active = 0;
    let peak = 0;
    const runTask = async (): Promise<void> => limiter.run("prod", async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, HOLD_MS);
      });
      active -= 1;
    });
    await Promise.all([runTask(), runTask(), runTask(), runTask(), runTask()]);
    expect(peak).toBeLessThanOrEqual(2);
    expect(peak).toBe(2);
  });
});
