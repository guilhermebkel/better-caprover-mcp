import { describe, expect, it } from "vitest";
import { LogTextUtil } from "@/Utils/LogTextUtil.ts";

const FAKE_SECRET = "fake-secret-value-123";

describe("LogTextUtil.buildTail()", () => {
  it("keeps the last lines and says the log was cut", () => {
    const tail = LogTextUtil.buildTail("one\ntwo\nthree\nfour", 2, []);

    expect(tail).toStrictEqual({
      lines: ["three", "four"],
      totalLines: 4,
      isTruncated: true,
    });
  });

  it("does not say the log was cut when it fits", () => {
    const tail = LogTextUtil.buildTail("one\ntwo", 2, []);

    expect(tail).toStrictEqual({ lines: ["one", "two"], totalLines: 2, isTruncated: false });
  });

  it("hides a secret in a line", () => {
    const tail = LogTextUtil.buildTail(`connecting with ${FAKE_SECRET}\nready`, 5, [FAKE_SECRET]);

    expect(tail.lines).toStrictEqual(["connecting with [REDACTED]", "ready"]);
  });

  it("drops control characters and blank lines", () => {
    const tail = LogTextUtil.buildTail("\u0001\u0002ok\r\n\r\n\u007Fnext\tline\n", 5, []);

    expect(tail.lines).toStrictEqual(["ok", "next\tline"]);
  });

  it("returns no lines for an empty log", () => {
    const tail = LogTextUtil.buildTail("", 5, []);

    expect(tail).toStrictEqual({ lines: [], totalLines: 0, isTruncated: false });
  });
});

describe("LogTextUtil.buildTailFromLines()", () => {
  it("treats each item as one line", () => {
    expect(LogTextUtil.buildTailFromLines(["a", "b", "c"], 2, []).lines).toStrictEqual(["b", "c"]);
  });
});
