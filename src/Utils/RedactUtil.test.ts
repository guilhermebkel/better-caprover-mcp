import { describe, expect, it } from "vitest";
import { RedactUtil } from "@/Utils/RedactUtil.ts";

const FAKE_SECRET = "fake-secret-value-123";

describe("RedactUtil.redactText()", () => {
  it("replaces every occurrence of a secret", () => {
    expect(RedactUtil.redactText(`a ${FAKE_SECRET} b ${FAKE_SECRET}`, [FAKE_SECRET])).toBe("a [REDACTED] b [REDACTED]");
  });

  it("replaces the longer secret first when one contains the other", () => {
    expect(RedactUtil.redactText("key=abcdefgh-extra", ["abcdefgh", "abcdefgh-extra"])).toBe("key=[REDACTED]");
  });

  it("leaves the text alone when no secret appears", () => {
    expect(RedactUtil.redactText("nothing to hide", [FAKE_SECRET])).toBe("nothing to hide");
  });

  it("ignores an empty secret", () => {
    expect(RedactUtil.redactText("text", [""])).toBe("text");
  });
});

describe("RedactUtil.redactValue()", () => {
  it("redacts strings inside nested objects and arrays", () => {
    const value = { lines: [`token ${FAKE_SECRET}`], nested: { note: FAKE_SECRET }, count: 2 };

    expect(RedactUtil.redactValue(value, [FAKE_SECRET])).toStrictEqual({
      lines: ["token [REDACTED]"],
      nested: { note: "[REDACTED]" },
      count: 2,
    });
  });
});

describe("RedactUtil.selectSecrets()", () => {
  it("keeps values of eight characters or more and drops shorter ones", () => {
    expect(RedactUtil.selectSecrets(["3000", "true", "1234567", "12345678", "a-long-secret"])).toStrictEqual([
      "12345678",
      "a-long-secret",
    ]);
  });
});
