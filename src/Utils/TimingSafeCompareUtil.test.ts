import { describe, expect, it } from "vitest";
import { TimingSafeCompareUtil } from "@/Utils/TimingSafeCompareUtil.ts";

describe("TimingSafeCompareUtil.isSecretMatching()", () => {
  const expectedSecret = "alpha-token-12345678";

  it("accepts an equal secret", () => {
    expect(TimingSafeCompareUtil.isSecretMatching(expectedSecret, expectedSecret)).toBe(true);
  });

  it("rejects a different secret", () => {
    expect(TimingSafeCompareUtil.isSecretMatching("wrong-token-123456789", expectedSecret)).toBe(false);
  });

  it("rejects a candidate with a different length without throwing", () => {
    expect(TimingSafeCompareUtil.isSecretMatching("short", expectedSecret)).toBe(false);
  });
});
