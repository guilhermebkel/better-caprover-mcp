import { describe, expect, it } from "vitest";
import { NetworkBindUtil } from "@/Utils/NetworkBindUtil.ts";

describe("NetworkBindUtil.buildProbeHost()", () => {
  it("points a wildcard bind at the loopback address", () => {
    expect([
      NetworkBindUtil.buildProbeHost("0.0.0.0"),
      NetworkBindUtil.buildProbeHost("::"),
    ]).toStrictEqual(["127.0.0.1", "[::1]"]);
  });

  it("keeps a named host and brackets an IPv6 literal", () => {
    expect([
      NetworkBindUtil.buildProbeHost("localhost"),
      NetworkBindUtil.buildProbeHost("::1"),
    ]).toStrictEqual(["localhost", "[::1]"]);
  });
});
