import { describe, expect, it } from "vitest";
import { HttpRateLimitError } from "@/Errors/HttpRateLimitError.ts";
import { HttpRateLimitService } from "@/Services/HttpRateLimitService.ts";

const RATE_LIMIT_MESSAGE = "Too many HTTP requests. Wait a moment, then try again.";

describe("HttpRateLimitService.assertAllowed()", () => {
  it("allows requests until the window limit is reached", () => {
    const limiter = new HttpRateLimitService(2);
    limiter.assertAllowed(1000);
    limiter.assertAllowed(1001);
    expect(() => {
      limiter.assertAllowed(1002);
    }).toThrow(HttpRateLimitError);
    expect(() => {
      limiter.assertAllowed(1002);
    }).toThrow(RATE_LIMIT_MESSAGE);
  });

  it("starts a new window after 60000 ms", () => {
    const limiter = new HttpRateLimitService(1);
    limiter.assertAllowed(0);
    expect(() => {
      limiter.assertAllowed(1);
    }).toThrow(RATE_LIMIT_MESSAGE);
    expect(() => {
      limiter.assertAllowed(60_000);
    }).not.toThrow();
  });
});
