import { describe, expect, it } from "vitest";
import { BatchUtil } from "@/Utils/BatchUtil.ts";

const ITEMS = ["one", "two", "three"];

const FAILING_CALL_COUNT = 2;

describe("BatchUtil.run()", () => {
  it("applies every item in order when none fails", async () => {
    const seen: string[] = [];

    const outcome = await BatchUtil.run(ITEMS, (item) => {
      seen.push(item);
      return Promise.resolve();
    });

    expect(outcome).toStrictEqual({ applied: ITEMS, notApplied: [] });
    expect(seen).toStrictEqual(ITEMS);
  });

  it("stops at the first failure and never runs the items after it", async () => {
    const seen: string[] = [];

    const outcome = await BatchUtil.run(ITEMS, (item) => {
      seen.push(item);
      return seen.length === FAILING_CALL_COUNT ? Promise.reject(new Error("boom")) : Promise.resolve();
    });

    expect(outcome).toStrictEqual({ applied: ["one"], failureMessage: "boom", notApplied: ["two", "three"] });
    expect(seen).toStrictEqual(["one", "two"]);
  });

  it("reports a failure on the first item as nothing applied", async () => {
    const outcome = await BatchUtil.run(ITEMS, () => Promise.reject(new Error("no")));

    expect(outcome).toStrictEqual({ applied: [], failureMessage: "no", notApplied: ITEMS });
  });
});

describe("BatchUtil.buildResult()", () => {
  it("summarizes a batch that fully ran", () => {
    const result = BatchUtil.buildResult({
      pastVerb: "Deleted",
      noun: "images",
      outcome: { applied: ["a", "b"], notApplied: [] },
    });

    expect(result.isError).toBeUndefined();
    expect(result.summary).toBe("Deleted 2 images.");
  });

  it("marks a stopped batch as an error, says nothing ran after it and that there is no transaction", () => {
    const result = BatchUtil.buildResult({
      pastVerb: "Deleted",
      noun: "images",
      outcome: { applied: ["a"], notApplied: ["b", "c"], failureMessage: "in use" },
    });

    expect(result.isError).toBe(true);
    expect(result.data).toStrictEqual({ applied: ["a"], notApplied: ["b", "c"], failure: "in use" });
    expect(result.summary).toContain("stopped at b: in use");
    expect(result.summary).toContain("none after the failure ran");
    expect(result.summary).toContain("no transactions");
  });
});
