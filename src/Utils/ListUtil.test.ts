import { describe, expect, it } from "vitest";
import { ListUtil } from "@/Utils/ListUtil.ts";

const ROWS = [
  { projectId: "p-1", name: "shop", tags: ["web"] },
  { projectId: "p-2", name: "blog", tags: ["web", "content"] },
  { projectId: "p-3", name: "docs", tags: [] },
];

describe("ListUtil.buildResult()", () => {
  it("returns every row and no hint when nothing is cut", () => {
    const result = ListUtil.buildResult({ noun: "projects", rows: ROWS, input: {} });

    expect(result.data).toStrictEqual({ projects: ROWS, total: 3, isTruncated: false });
    expect(result.summary).toBe("3 projects match; showing 3.");
  });

  it("cuts at the limit, keeps the total and names the parameters that return the rest", () => {
    const result = ListUtil.buildResult({ noun: "projects", rows: ROWS, input: { limit: 2 } });

    expect(result.data).toStrictEqual({
      projects: [ROWS[0], ROWS[1]],
      total: 3,
      isTruncated: true,
      nextStep: "1 more match. Raise `limit` (at most 200) or narrow `filter`.",
    });
    expect(result.summary).toContain("Raise `limit`");
  });

  it("filters on any text field, ignoring case, before it cuts", () => {
    const result = ListUtil.buildResult({ noun: "projects", rows: ROWS, input: { filter: "BLOG" } });

    expect(result.data).toStrictEqual({ projects: [ROWS[1]], total: 1, isTruncated: false });
  });

  it("filters on the items of a list of texts", () => {
    const result = ListUtil.buildResult({ noun: "projects", rows: ROWS, input: { filter: "content" } });

    expect(result.data).toMatchObject({ total: 1 });
  });

  it("returns only the fields that were asked for", () => {
    const result = ListUtil.buildResult({ noun: "projects", rows: ROWS, input: { fields: ["name"], limit: 1 } });

    expect(result.data).toMatchObject({ projects: [{ name: "shop" }] });
  });

  it("returns an empty list and a total of zero when nothing matches", () => {
    const result = ListUtil.buildResult({ noun: "projects", rows: ROWS, input: { filter: "zzz" } });

    expect(result.data).toStrictEqual({ projects: [], total: 0, isTruncated: false });
  });
});
