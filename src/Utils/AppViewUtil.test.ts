import { describe, expect, it } from "vitest";
import { FakeCaproverClientAdapter } from "@/Adapters/CapRover/FakeCaproverClientAdapter.ts";
import { AppViewUtil } from "@/Utils/AppViewUtil.ts";

const FAKE_SECRET = "fake-secret-value-123";

describe("AppViewUtil.buildDetailed()", () => {
  it("shows the key of an env var and whether it is set, never the value", () => {
    const app = FakeCaproverClientAdapter.buildApp({
      envVars: [{ key: "API_TOKEN", value: FAKE_SECRET }, { key: "EMPTY", value: "" }],
    });

    const view = AppViewUtil.buildDetailed(app);

    expect(view.envVars).toStrictEqual([{ key: "API_TOKEN", isSet: true }, { key: "EMPTY", isSet: false }]);
    expect(JSON.stringify(view)).not.toContain(FAKE_SECRET);
  });
});

describe("AppViewUtil.buildConcise()", () => {
  it("returns the name, URL, instances, image and build flag", () => {
    const app = FakeCaproverClientAdapter.buildApp();

    expect(AppViewUtil.buildConcise(app)).toStrictEqual({
      appName: "web",
      url: "https://web.example.com",
      instanceCount: 1,
      imageName: "nginx:1.27",
      isBuilding: false,
    });
  });
});
