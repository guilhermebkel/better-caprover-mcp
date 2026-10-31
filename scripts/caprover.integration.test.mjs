import { describe, expect, it } from "vitest";
import { CaproverClientAdapter } from "@/Adapters/CapRover/CaproverClientAdapter.ts";

const URL_ENV = process.env.CAPROVER_TEST_URL ?? "http://127.0.0.1:3000";
const PASSWORD_ENV = process.env.CAPROVER_TEST_PASSWORD ?? "captain42";
const APP_NAME = `mcp-it-${Date.now().toString(36)}`;
const PLACEHOLDER_IMAGE = "caprover/caprover-placeholder-app:latest";
const POLL_TIMEOUT_MS = 90_000;

describe("CaproverClientAdapter against a real CapRover", () => {
  const client = new CaproverClientAdapter({ url: URL_ENV, password: PASSWORD_ENV });

  it("logs in and reads the version", async () => {
    const info = await client.getSystemInfo();

    expect(info.currentVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("refuses a wrong password with a clear message", async () => {
    const wrong = new CaproverClientAdapter({ url: URL_ENV, password: "definitely-wrong" });

    await expect(wrong.getSystemInfo()).rejects.toThrow(
      "CapRover rejected the password. Tell the person to check CAPROVER_PASSWORD.",
    );
  });

  it("creates an app, which then shows in the list", async () => {
    await client.createApp({ appName: APP_NAME, hasPersistentData: false });

    const { apps } = await client.listApps();

    expect(apps.map((app) => app.appName)).toContain(APP_NAME);
  });

  it("refuses to create an app twice and says so", async () => {
    await expect(client.createApp({ appName: APP_NAME, hasPersistentData: false })).rejects.toThrow(
      /CapRover refused the request \(code \d+\): .*exist/i,
    );
  });

  it("sets env vars and reads them back", async () => {
    await client.setEnvVars(APP_NAME, [{ key: "GREETING", value: "hello" }]);

    const { apps } = await client.listApps();

    expect(apps.find((app) => app.appName === APP_NAME)?.envVars).toStrictEqual([{ key: "GREETING", value: "hello" }]);
  });

  it("changes the instance count", async () => {
    await client.setInstanceCount(APP_NAME, 2);

    const { apps } = await client.listApps();

    expect(apps.find((app) => app.appName === APP_NAME)?.instanceCount).toBe(2);
  });

  it("deploys an image and finishes the build in the background", async () => {
    await client.deployImage(APP_NAME, PLACEHOLDER_IMAGE);

    await expect.poll(async () => (await client.getBuildLogs(APP_NAME)).lines.join("\n"), {
      timeout: POLL_TIMEOUT_MS,
    }).toContain("Build has finished successfully!");
  });

  it("reads the app logs without the Docker frame headers", async () => {
    await expect.poll(() => client.getAppLogs(APP_NAME), { timeout: POLL_TIMEOUT_MS }).toMatch(/^\d{4}-\d{2}-\d{2}T/m);
  });

  it("deletes the app", async () => {
    await client.deleteApp(APP_NAME, []);

    const { apps } = await client.listApps();

    expect(apps.map((app) => app.appName)).not.toContain(APP_NAME);
  });
});
