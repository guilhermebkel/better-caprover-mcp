import { describe, expect, it } from "vitest";
import { HttpRateLimitService } from "@/Services/HttpRateLimitService.ts";

describe("HttpRateLimitService.assertAllowed()", () => {
  it("allows requests until the window limit is reached", () => {
    const limiter = new HttpRateLimitService(2);
    limiter.assertAllowed("client", 1000);
    limiter.assertAllowed("client", 1001);
    expect(() => {
      limiter.assertAllowed("client", 1002);
    }).toThrow(/Too many HTTP requests/);
  });
});
