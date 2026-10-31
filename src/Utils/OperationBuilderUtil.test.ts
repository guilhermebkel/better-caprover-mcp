import { describe, expect, it } from "vitest";
import { OperationBuilderUtil } from "@/Utils/OperationBuilderUtil.ts";

describe("OperationBuilderUtil.buildToolName()", () => {
  it.each([
    { operationName: "listApps", toolName: "list_apps" },
    { operationName: "getAppRuntime", toolName: "get_app_runtime" },
    { operationName: "listOneClickApps", toolName: "list_one_click_apps" },
  ])("turns $operationName into $toolName", (row) => {
    expect(OperationBuilderUtil.buildToolName(row.operationName)).toBe(row.toolName);
  });
});
