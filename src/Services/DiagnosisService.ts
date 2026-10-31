import { ToolFailureError } from "@/Errors/ToolFailureError.ts";
import type { CaproverApp, CaproverAppRuntime, CaproverBuildLogs, CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type {
  AppDiagnosis,
  AppFacts,
  AppScreen,
  FactRead,
  FactNameToSkipReason,
  Finding,
  ScreenResult,
  ServerFacts,
  ServerScreen,
} from "@/Protocols/DiagnosisProtocol.ts";
import { DEFAULT_KEEP_RECENT_COUNT } from "@/Schemas/MaintenanceInputSchema.ts";
import { DiagnosisRuleUtil } from "@/Utils/DiagnosisRuleUtil.ts";
import { LogTextUtil } from "@/Utils/LogTextUtil.ts";
import { RedactUtil } from "@/Utils/RedactUtil.ts";

export class DiagnosisService {
  static readonly LOG_LINES = 100;

  static readonly BUILD_LINES = 500;

  constructor(private readonly client: CaproverClientPort) {}

  async findAppDiagnosis(app: CaproverApp, knownRuntime?: CaproverAppRuntime): Promise<AppDiagnosis> {
    const secrets = RedactUtil.selectSecrets(app.envVars.map((envVar) => envVar.value));
    const runtime = knownRuntime === undefined
      ? await DiagnosisService.readFact(() => this.client.getAppRuntime(app.appName))
      : { value: knownRuntime };
    const build = await DiagnosisService.readFact(() => this.readBuild(app, secrets));
    const logs = await DiagnosisService.readFact(() => this.readLogs(app, secrets));
    const facts: AppFacts = { app, runtime: runtime.value, build: build.value, logLines: logs.value };
    const skips: FactNameToSkipReason = { runtime: runtime.skipReason, build: build.skipReason, logs: logs.skipReason };
    const diagnosis = DiagnosisRuleUtil.checkApp(facts, skips);
    return DiagnosisService.redactDiagnosis(diagnosis, secrets);
  }

  async findAppsIssues(apps: readonly CaproverApp[]): Promise<ScreenResult> {
    const runtimes = await DiagnosisService.readFact(() => this.client.listAppsRuntime());
    const appNameToRuntime = new Map((runtimes.value ?? []).map((runtime) => [runtime.appName, runtime]));
    const findings: Finding[] = [];
    let appsRead = 0;
    for (const app of apps) {
      const runtime = appNameToRuntime.get(app.appName);
      const diagnosis = await this.findOneAppIssues(app, runtime, runtimes.skipReason);
      appsRead += diagnosis.isRead ? 1 : 0;
      findings.push(...diagnosis.findings);
    }
    return { findings, appsRead, appsChecked: apps.length, isRuntimeSkipped: runtimes.value === undefined };
  }

  async findServerIssues(): Promise<ServerScreen> {
    const [system, disks, images] = await Promise.all([
      DiagnosisService.readFact(() => this.client.getSystemInfo()),
      DiagnosisService.readFact(() => this.client.getDiskUsage()),
      DiagnosisService.readFact(() => this.client.listUnusedImages(DEFAULT_KEEP_RECENT_COUNT)),
    ]);
    const facts: ServerFacts = { system: system.value, disks: disks.value, unusedImages: images.value };
    const skippedChecks = [
      ...(system.value === undefined ? ["root_domain_without_ssl", "caprover_update_available"] : []),
      ...(disks.value === undefined ? ["disk_low"] : []),
      ...(images.value === undefined ? ["unused_images"] : []),
    ];
    return { findings: DiagnosisRuleUtil.checkServer(facts), skippedChecks };
  }

  private async findOneAppIssues(
    app: CaproverApp,
    runtime: CaproverAppRuntime | undefined,
    runtimeSkipReason: string | undefined,
  ): Promise<AppScreen> {
    const missingRuntime = runtimeSkipReason ?? "CapRover gave no runtime for this app.";
    const skips: FactNameToSkipReason = {
      runtime: runtime === undefined ? missingRuntime : undefined,
      build: "Not read.",
      logs: "Not read.",
    };
    const shallow = DiagnosisRuleUtil.checkApp({ app, runtime }, skips);
    const hasSign = app.isBuilding
      || shallow.findings.some((finding) => finding.severity !== "info")
      || (runtime !== undefined && runtime.status !== "running");
    if (!hasSign) {
      return { findings: shallow.findings, isRead: false };
    }
    const deep = await this.findAppDiagnosis(app, runtime);
    return { findings: deep.findings, isRead: true };
  }

  private async readBuild(app: CaproverApp, secrets: readonly string[]): Promise<CaproverBuildLogs> {
    const build = await this.client.getBuildLogs(app.appName);
    const tail = LogTextUtil.buildTailFromLines(build.lines, DiagnosisService.BUILD_LINES, secrets);
    return { ...build, lines: tail.lines };
  }

  private async readLogs(app: CaproverApp, secrets: readonly string[]): Promise<string[]> {
    const text = await this.client.getAppLogs(app.appName);
    return LogTextUtil.buildTail(text, DiagnosisService.LOG_LINES, secrets).lines;
  }

  private static async readFact<Value>(read: () => Promise<Value>): Promise<FactRead<Value>> {
    try {
      return { value: await read() };
    } catch (error) {
      if (error instanceof ToolFailureError) {
        return { skipReason: error.message };
      }
      throw error;
    }
  }

  private static redactDiagnosis(diagnosis: AppDiagnosis, secrets: readonly string[]): AppDiagnosis {
    const findings = diagnosis.findings.map((finding) => ({
      ...finding,
      evidence: finding.evidence.map((line) => RedactUtil.redactText(line, secrets)),
    }));
    return { ...diagnosis, findings };
  }
}
