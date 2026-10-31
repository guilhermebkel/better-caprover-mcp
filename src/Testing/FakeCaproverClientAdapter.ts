import type { FakeCaproverOptions } from "@/Protocols/FakeCaproverClientProtocol.ts";
import { CaproverRequestError } from "@/Errors/CaproverRequestError.ts";
import type {
  CaproverApp,
  CaproverAppList,
  CaproverAppRuntime,
  CaproverBuildLogs,
  CaproverClientPort,
  CaproverEnvVar,
  CaproverOneClickApp,
  CaproverSystemInfo,
  NewAppRequest,
} from "@/Protocols/CaproverClientProtocol.ts";

export class FakeCaproverClientAdapter implements CaproverClientPort {
  readonly calls: string[] = [];

  constructor(
    private readonly apps: CaproverApp[],
    private readonly options: FakeCaproverOptions = {},
  ) {}

  static buildApp(overrides: Partial<CaproverApp> = {}): CaproverApp {
    return {
      appName: "web",
      url: "https://web.example.com",
      instanceCount: 1,
      deployedVersion: 3,
      imageName: "nginx:1.27",
      hasPersistentData: false,
      isExposedAsWebApp: true,
      hasForcedSsl: false,
      hasDefaultDomainSsl: true,
      containerHttpPort: 80,
      isBuilding: false,
      customDomains: [],
      envVars: [],
      ports: [],
      volumes: [],
      ...overrides,
    };
  }

  async getSystemInfo(): Promise<CaproverSystemInfo> {
    await this.record("getSystemInfo");
    return {
      rootDomain: "example.com",
      hasRootSsl: true,
      isSslForced: false,
      currentVersion: "1.14.1",
      latestVersion: "1.14.1",
      canUpdate: false,
    };
  }

  async listApps(): Promise<CaproverAppList> {
    await this.record("listApps");
    return { rootDomain: "example.com", apps: this.apps };
  }

  async getAppRuntime(appName: string): Promise<CaproverAppRuntime> {
    await this.record(`getAppRuntime:${appName}`);
    return {
      appName,
      status: "running",
      desiredInstances: 1,
      runningInstances: 1,
      tasks: [{ state: "running", image: "nginx:1.27", message: "started" }],
    };
  }

  async getAppLogs(appName: string): Promise<string> {
    await this.record(`getAppLogs:${appName}`);
    return this.options.appLogs ?? "";
  }

  async getBuildLogs(appName: string): Promise<CaproverBuildLogs> {
    await this.record(`getBuildLogs:${appName}`);
    return { isBuilding: false, isFailed: false, lines: this.options.buildLines ?? [] };
  }

  async listOneClickApps(): Promise<CaproverOneClickApp[]> {
    await this.record("listOneClickApps");
    return [
      { name: "postgres", displayName: "PostgreSQL", description: "The SQL database" },
      { name: "redis", displayName: "Redis", description: "In-memory store" },
    ];
  }

  async createApp(request: NewAppRequest): Promise<void> {
    await this.record(`createApp:${request.appName}:${request.hasPersistentData}`);
  }

  async deployImage(appName: string, imageName: string): Promise<void> {
    await this.record(`deployImage:${appName}:${imageName}`);
  }

  async setEnvVars(appName: string, envVars: CaproverEnvVar[]): Promise<void> {
    await this.record(`setEnvVars:${appName}:${envVars.map((envVar) => envVar.key).join(",")}`);
  }

  async setInstanceCount(appName: string, instanceCount: number): Promise<void> {
    await this.record(`setInstanceCount:${appName}:${instanceCount}`);
  }

  async addCustomDomain(appName: string, domain: string): Promise<void> {
    await this.record(`addCustomDomain:${appName}:${domain}`);
  }

  async enableSsl(appName: string, domain: string | undefined): Promise<void> {
    await this.record(`enableSsl:${appName}:${domain ?? "default"}`);
  }

  async deleteApp(appName: string, volumeNames: string[]): Promise<void> {
    await this.record(`deleteApp:${appName}:${volumeNames.join(",")}`);
  }

  private async record(call: string): Promise<void> {
    if (this.options.hangUntilReleased !== undefined) {
      await this.options.hangUntilReleased();
    }
    if (this.options.delayMs !== undefined) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, this.options.delayMs);
      });
    }
    this.calls.push(call);
    if (this.options.failureMessage !== undefined) {
      return Promise.reject(new CaproverRequestError(this.options.failureMessage));
    }
    return Promise.resolve();
  }
}
