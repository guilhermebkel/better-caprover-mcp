import { describe, expect, it } from "vitest";
import { ClosestNameUtil } from "@/Utils/ClosestNameUtil.ts";

describe("ClosestNameUtil.find()", () => {
  it("puts the name with the fewest edits first", () => {
    const closest = ClosestNameUtil.find("wep", ["api", "web", "worker"], 2);

    expect(closest).toStrictEqual(["web", "api"]);
  });

  it("ignores case", () => {
    const closest = ClosestNameUtil.find("WEB", ["web", "api"], 1);

    expect(closest).toStrictEqual(["web"]);
  });

  it("returns nothing when there are no candidates", () => {
    const closest = ClosestNameUtil.find("web", [], 3);

    expect(closest).toStrictEqual([]);
  });
});
