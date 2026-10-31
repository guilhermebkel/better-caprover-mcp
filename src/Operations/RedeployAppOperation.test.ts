import { describe, expect, it } from "vitest";
import { RedeployAppOperation } from "@/Operations/RedeployAppOperation.ts";
import { AppResolverService } from "@/Services/AppResolverService.ts";
import { FakeCaproverClientAdapter } from "@/Testing/FakeCaproverClientAdapter.ts";

const buildOperation = (fake: FakeCaproverClientAdapter): RedeployAppOperation =>
  new RedeployAppOperation(fake, new AppResolverService(fake));

describe("RedeployAppOperation.execute()", () => {
  it("sends the image the app runs now once", async () => {
    const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp({ imageName: "registry.example.com/web:7" })]);

    const result = await buildOperation(fake).execute({ app_name: "web" });

    expect(fake.calls).toStrictEqual(["listApps", "deployImage:web:registry.example.com/web:7"]);
    expect(result.data).toStrictEqual({ appName: "web", imageName: "registry.example.com/web:7" });
  });

  it("fails without a deploy call when the app has no image name", async () => {
    const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp({ imageName: undefined })]);

    await expect(buildOperation(fake).execute({ app_name: "web" })).rejects.toThrow("App \"web\" has no image name");
    expect(fake.calls).toStrictEqual(["listApps"]);
  });

  it("fails with the closest app names when the app does not exist", async () => {
    const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp()]);

    await expect(buildOperation(fake).execute({ app_name: "wbe" })).rejects.toThrow("Closest app names: web.");
  });
});

describe("RedeployAppOperation.describeChange()", () => {
  it("says what it would send and makes no write call", async () => {
    const fake = new FakeCaproverClientAdapter([FakeCaproverClientAdapter.buildApp({ imageName: "nginx:1.27" })]);

    const result = await buildOperation(fake).describeChange({ app_name: "web" });

    expect(result.summary).toBe("Would send nginx:1.27 again to web. CapRover restarts the app.");
    expect(fake.calls).toStrictEqual(["listApps"]);
  });
});
