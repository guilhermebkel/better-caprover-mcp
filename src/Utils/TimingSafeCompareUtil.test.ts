import { describe, expect, it } from "vitest";
import { TimingSafeCompareUtil } from "@/Utils/TimingSafeCompareUtil.ts";

describe("TimingSafeCompareUtil.isAnySecretMatching()", () => {
  it("accepts a matching secret among several", () => {
    const isMatching = TimingSafeCompareUtil.isAnySecretMatching("alpha-token", ["other", "alpha-token"]);
    expect(isMatching).toBe(true);
  });

  it("rejects a wrong secret even when another would match", () => {
    const isMatching = TimingSafeCompareUtil.isAnySecretMatching("wrong", ["expected-one", "expected-two"]);
    expect(isMatching).toBe(false);
  });

  it("checks every configured secret without short-circuiting on length", () => {
    const secrets = ["a".repeat(40), "b".repeat(40)];
    const isMatching = TimingSafeCompareUtil.isAnySecretMatching("c".repeat(40), secrets);
    expect(isMatching).toBe(false);
  });
});
