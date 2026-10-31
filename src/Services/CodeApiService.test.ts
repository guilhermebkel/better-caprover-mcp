import { describe, expect, it } from "vitest";
import type { CodeApiEntry } from "@/Protocols/CodeProtocol.ts";
import { CodeApiService } from "@/Services/CodeApiService.ts";

const buildEntry = (api: string, tool: string, description: string): CodeApiEntry => ({
  api,
  tool,
  description,
  risk: "read",
  signature: `${api}(): Promise<unknown>`,
});

describe("CodeApiService.buildPath()", () => {
  it.each([
    ["list_apps", "apps.list"],
    ["get_app", "app.get"],
    ["get_app_logs", "appLogs.get"],
    ["set_env_vars", "envVars.set"],
    ["deploy_one_click", "oneClick.deploy"],
    ["list_one_click_apps", "oneClickApps.list"],
    ["update_caprover", "caprover.update"],
  ])("turns the tool %s into %s", (tool, path) => {
    expect(CodeApiService.buildPath(tool)).toBe(path);
  });
});

describe("CodeApiService.search()", () => {
  const entries = [
    buildEntry("caprover.apps.list", "list_apps", "Lists the apps."),
    buildEntry("caprover.envVars.set", "set_env_vars", "Sets environment variables of an app."),
    buildEntry("caprover.app.delete", "delete_app", "Deletes one app."),
  ];

  it("ranks a match in the name above a match in the description", () => {
    const found = CodeApiService.search(entries, "app", 10);

    expect(found.matches.map((match) => match.tool)).toStrictEqual(["delete_app", "list_apps", "set_env_vars"]);
  });

  it("returns nothing for a query that matches nothing", () => {
    const found = CodeApiService.search(entries, "zebra", 10);

    expect(found).toStrictEqual({ matches: [], total: 0, isTruncated: false });
  });

  it("lists everything for an empty query and cuts at the limit", () => {
    const found = CodeApiService.search(entries, "", 2);

    expect(found.total).toBe(3);
    expect(found.isTruncated).toBe(true);
    expect(found.matches).toHaveLength(2);
  });
});
