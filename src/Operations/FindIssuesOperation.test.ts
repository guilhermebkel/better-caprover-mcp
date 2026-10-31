import { describe, expect, it } from "vitest";
import type { FakeCaproverOptions } from "@/Protocols/FakeCaproverClientProtocol.ts";
import type { CaproverApp } from "@/Protocols/CaproverClientProtocol.ts";
import type { Finding } from "@/Protocols/DiagnosisProtocol.ts";
import { FindIssuesOperation } from "@/Operations/FindIssuesOperation.ts";
import { DiagnosisService } from "@/Services/DiagnosisService.ts";
import { FakeCaproverClientAdapter } from "@/Testing/FakeCaproverClientAdapter.ts";

const IMAGE_NAME = "nginx:1.27";

const buildFake = (apps: CaproverApp[], options: FakeCaproverOptions = {}): FakeCaproverClientAdapter =>
  new FakeCaproverClientAdapter(apps, { unusedImages: [], ...options });

const buildOperation = (fake: FakeCaproverClientAdapter): FindIssuesOperation =>
  new FindIssuesOperation(fake, new DiagnosisService(fake));

const readSeverities = (data: Record<string, unknown>): string[] => {
  const findings = data.findings as Finding[];
  return findings.map((finding) => finding.severity);
};

const MIXED_APPS = [
  FakeCaproverClientAdapter.buildApp({ appName: "a-latest", imageName: "nginx" }),
  FakeCaproverClientAdapter.buildApp({ appName: "b-stopped", instanceCount: 0 }),
  FakeCaproverClientAdapter.buildApp({ appName: "c-plain", customDomains: [{ publicDomain: "c.example.org", hasSsl: false }] }),
  FakeCaproverClientAdapter.buildApp({ appName: "d-forced", hasForcedSsl: true, hasDefaultDomainSsl: false }),
];

describe("FindIssuesOperation.execute()", () => {
  it("returns the most severe findings first and says that the list was cut at limit", async () => {
    const operation = buildOperation(buildFake(MIXED_APPS));

    const result = await operation.execute({ limit: 2 });

    expect(readSeverities(result.data)).toStrictEqual(["error", "error"]);
    expect(result.data.total).toBe(4);
    expect(result.data.isTruncated).toBe(true);
    expect(result.summary).toContain("2 more findings. Raise `limit` (at most 200) or set `name_contains`.");
  });

  it("returns every finding in severity order when limit is not reached", async () => {
    const operation = buildOperation(buildFake(MIXED_APPS));

    const result = await operation.execute({});

    expect(readSeverities(result.data)).toStrictEqual(["error", "error", "warning", "info"]);
    expect(result.data.isTruncated).toBe(false);
  });

  it("says that no finding was produced when apps and server are healthy", async () => {
    const operation = buildOperation(buildFake([FakeCaproverClientAdapter.buildApp({ imageName: IMAGE_NAME })]));

    const result = await operation.execute({});

    expect(result.data.findings).toStrictEqual([]);
    expect(result.summary).toBe("No finding was produced by the rules. Checked 1 apps, read the logs of 0.");
  });

  it("reads the logs only of apps that show another sign", async () => {
    const fake = buildFake([
      FakeCaproverClientAdapter.buildApp({ appName: "healthy", imageName: IMAGE_NAME }),
      FakeCaproverClientAdapter.buildApp({ appName: "stopped", imageName: IMAGE_NAME, instanceCount: 0 }),
    ]);

    const result = await buildOperation(fake).execute({});

    expect(fake.calls.filter((call) => call.startsWith("getAppLogs"))).toStrictEqual(["getAppLogs:stopped"]);
    expect(result.data.appsRead).toBe(1);
    expect(result.data.appsChecked).toBe(2);
  });

  it("does not read the logs of an app that only has an image tag finding", async () => {
    const fake = buildFake([FakeCaproverClientAdapter.buildApp({ imageName: "nginx" })]);

    await buildOperation(fake).execute({});

    expect(fake.calls.filter((call) => call.startsWith("getAppLogs") || call.startsWith("getBuildLogs"))).toStrictEqual([]);
  });

  it("reads the logs of an app that is building", async () => {
    const app = FakeCaproverClientAdapter.buildApp({ isBuilding: true });
    const fake = buildFake([app], { buildState: { isBuilding: true } });

    const result = await buildOperation(fake).execute({});

    expect(result.data.appsRead).toBe(1);
    expect((result.data.findings as Finding[]).map((finding) => finding.kind)).toStrictEqual(["build_stuck"]);
  });

  it("reads the logs of an app whose runtime is not running", async () => {
    const fake = buildFake([FakeCaproverClientAdapter.buildApp()], { runtime: { status: "degraded", runningInstances: 0 } });

    const result = await buildOperation(fake).execute({});

    expect(result.data.appsRead).toBe(1);
    expect((result.data.findings as Finding[]).map((finding) => finding.kind)).toStrictEqual(["no_instances_running"]);
  });

  it("adds the server findings with their own severity", async () => {
    const fake = buildFake([], { diskSeverity: "critical", systemInfo: { canUpdate: true, hasRootSsl: false } });

    const result = await buildOperation(fake).execute({});

    expect((result.data.findings as Finding[]).map((finding) => finding.kind)).toStrictEqual([
      "disk_low", "root_domain_without_ssl", "caprover_update_available",
    ]);
  });

  it("checks only the apps that match name_contains and skips the server checks", async () => {
    const fake = buildFake(MIXED_APPS, { diskSeverity: "critical" });

    const result = await buildOperation(fake).execute({ name_contains: "STOPPED" });

    expect(result.data.appsChecked).toBe(1);
    expect(result.data.total).toBe(1);
    expect(fake.calls).not.toContain("getDiskUsage");
  });

  it("says that runtime rules were skipped when CapRover gives no runtime", async () => {
    const fake = buildFake([FakeCaproverClientAdapter.buildApp()], { failureMessage: "no runtime endpoint", failOnCall: "listAppsRuntime" });

    const result = await buildOperation(fake).execute({});

    expect(result.summary).toContain("Runtime rules were skipped because CapRover gave no runtime.");
    expect(result.data.skippedChecks).toStrictEqual(["runtime"]);
  });

  it("names the server checks it could not run", async () => {
    const fake = buildFake([], { failureMessage: "denied", failOnCall: "getDiskUsage" });

    const result = await buildOperation(fake).execute({});

    expect(result.data.skippedChecks).toStrictEqual(["disk_low"]);
    expect(result.summary).toContain("Server checks skipped: disk_low.");
  });

  it("keeps the value of an env var out of the findings", async () => {
    const secret = "planted-env-value-4321";
    const app = FakeCaproverClientAdapter.buildApp({ instanceCount: 0, envVars: [{ key: "API_TOKEN", value: secret }] });
    const fake = buildFake([app], { appLogs: `Error: missing environment variable DB_URL, token ${secret}\n` });

    const result = await buildOperation(fake).execute({});

    expect((result.data.findings as unknown[]).length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
