import type { FakeCaproverOptions } from "@/Protocols/FakeCaproverClientProtocol.ts";
import { CaproverRequestError } from "@/Errors/CaproverRequestError.ts";
import type {
  CaproverApp,
  CaproverAppList,
  CaproverAppRuntime,
  CaproverBuildLogs,
  CaproverClientPort,
  CaproverDiskCleanup,
  CaproverEnvVar,
  CaproverGoAccess,
  CaproverGoAccessReport,
  CaproverLoadBalancer,
  CaproverNetData,
  CaproverNginxConfig,
  CaproverNode,
  CaproverNodeDisks,
  CaproverOneClickApp,
  CaproverOneClickProgress,
  CaproverOneClickTemplate,
  CaproverProAlert,
  CaproverProject,
  CaproverProState,
  CaproverRegistryList,
  CaproverSystemInfo,
  CaproverTheme,
  CaproverUnusedImage,
  GoAccessRequest,
  NewAppRequest,
  NewNodeRequest,
  NewProjectRequest,
  OneClickVariableValue,
  RegistryRequest,
  ThemeRequest,
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

  async listAppsRuntime(): Promise<CaproverAppRuntime[]> {
    await this.record("listAppsRuntime");
    return this.apps.map((app) => ({ appName: app.appName, status: "running", desiredInstances: 1, runningInstances: 1, tasks: [] }));
  }

  async renameApp(appName: string, newAppName: string): Promise<void> {
    await this.record(`renameApp:${appName}:${newAppName}`);
  }

  async startBuild(webhookPath: string): Promise<void> {
    await this.record(`startBuild:${webhookPath}`);
  }

  async uploadAppArchive(appName: string, archive: Uint8Array): Promise<void> {
    await this.record(`uploadAppArchive:${appName}:${archive.byteLength}`);
  }

  async removeCustomDomain(appName: string, domain: string): Promise<void> {
    await this.record(`removeCustomDomain:${appName}:${domain}`);
  }

  async updateRootDomain(rootDomain: string, isForced: boolean): Promise<void> {
    await this.record(`updateRootDomain:${rootDomain}:${isForced}`);
  }

  async enableRootSsl(emailAddress: string): Promise<void> {
    await this.record(`enableRootSsl:${emailAddress}`);
  }

  async setForceSsl(isEnabled: boolean): Promise<void> {
    await this.record(`setForceSsl:${isEnabled}`);
  }

  async listProjects(): Promise<CaproverProject[]> {
    await this.record("listProjects");
    return [
      { projectId: "p-1", name: "shop", description: "The shop", parentProjectId: undefined },
      { projectId: "p-2", name: "blog", description: "The blog", parentProjectId: "p-1" },
      { projectId: "p-3", name: "docs", description: "The docs", parentProjectId: undefined },
    ];
  }

  async createProject(request: NewProjectRequest): Promise<CaproverProject> {
    await this.record(`createProject:${request.name}`);
    return { projectId: "p-new", name: request.name, description: request.description, parentProjectId: request.parentProjectId };
  }

  async updateProject(project: CaproverProject): Promise<void> {
    await this.record(`updateProject:${project.projectId}:${project.name}`);
  }

  async deleteProjects(projectIds: string[]): Promise<void> {
    await this.record(`deleteProjects:${projectIds.join(",")}`);
  }

  async getOneClickApp(templateName: string): Promise<CaproverOneClickTemplate> {
    await this.record(`getOneClickApp:${templateName}`);
    return {
      displayName: "PostgreSQL",
      variables: [{ variableId: "$$cap_pg_pass", label: "Password", defaultValue: "", description: "The database password" }],
      template: {},
    };
  }

  async listOneClickRepos(): Promise<string[]> {
    await this.record("listOneClickRepos");
    return ["https://oneclick-apps.caprover.com"];
  }

  async addOneClickRepo(repositoryUrl: string): Promise<void> {
    await this.record(`addOneClickRepo:${repositoryUrl}`);
  }

  async deleteOneClickRepo(repositoryUrl: string): Promise<void> {
    await this.record(`deleteOneClickRepo:${repositoryUrl}`);
  }

  async startOneClickDeploy(templateName: string, values: OneClickVariableValue[]): Promise<string> {
    await this.record(`startOneClickDeploy:${templateName}:${values.map((entry) => entry.variableId).join(",")}`);
    return "job-1";
  }

  async getOneClickDeployProgress(jobId: string): Promise<CaproverOneClickProgress> {
    await this.record(`getOneClickDeployProgress:${jobId}`);
    return { steps: ["Creating app", "Deploying"], currentStep: 2, successMessage: "Done" };
  }

  async listRegistries(): Promise<CaproverRegistryList> {
    await this.record("listRegistries");
    return {
      registries: [{
        registryId: "reg-1",
        registryUser: "deploy",
        registryDomain: "registry.example.com",
        registryImagePrefix: "team",
        registryType: "REMOTE_REG",
      }],
      defaultPushRegistryId: "reg-1",
    };
  }

  async addRegistry(request: RegistryRequest): Promise<void> {
    await this.record(`addRegistry:${request.registryId}`);
  }

  async updateRegistry(request: RegistryRequest): Promise<void> {
    await this.record(`updateRegistry:${request.registryId}`);
  }

  async deleteRegistry(registryId: string): Promise<void> {
    await this.record(`deleteRegistry:${registryId}`);
  }

  async setDefaultPushRegistry(registryId: string): Promise<void> {
    await this.record(`setDefaultPushRegistry:${registryId}`);
  }

  async enableSelfHostedRegistry(): Promise<void> {
    await this.record("enableSelfHostedRegistry");
  }

  async disableSelfHostedRegistry(): Promise<void> {
    await this.record("disableSelfHostedRegistry");
  }

  async listNodes(): Promise<CaproverNode[]> {
    await this.record("listNodes");
    return [{
      nodeId: "node-1",
      nodeRole: "manager",
      isLeader: true,
      hostname: "captain-1",
      architecture: "x86_64",
      operatingSystem: "linux",
      memoryBytes: 8_000_000_000,
      dockerEngineVersion: "27.0.0",
      ipAddress: "10.0.0.1",
      nodeState: "ready",
      availability: "active",
    }];
  }

  async addNode(request: NewNodeRequest): Promise<void> {
    await this.record(`addNode:${request.nodeRole}:${request.remoteNodeIpAddress}`);
  }

  async getLoadBalancer(): Promise<CaproverLoadBalancer> {
    await this.record("getLoadBalancer");
    return {
      activeConnections: 3,
      acceptedConnections: 100,
      handledConnections: 100,
      totalRequests: 250,
      readingConnections: 0,
      writingConnections: 1,
      waitingConnections: 2,
    };
  }

  async getDiskUsage(): Promise<CaproverNodeDisks[]> {
    await this.record("getDiskUsage");
    return [{
      nodeId: "node-1",
      hostname: "captain-1",
      disks: [{ totalBytes: 100, usedBytes: 40, availableBytes: 60, severity: "normal" }],
    }];
  }

  async listUnusedImages(mostRecentLimit: number): Promise<CaproverUnusedImage[]> {
    await this.record(`listUnusedImages:${mostRecentLimit}`);
    return [{ imageId: "sha256:aaa", tags: ["old:1"] }, { imageId: "sha256:bbb", tags: [] }];
  }

  async deleteImages(imageIds: string[]): Promise<void> {
    await this.record(`deleteImages:${imageIds.join(",")}`);
  }

  async getDiskCleanup(): Promise<CaproverDiskCleanup> {
    await this.record("getDiskCleanup");
    return { mostRecentLimit: 3, cronSchedule: "0 0 * * *", timezone: "UTC" };
  }

  async setDiskCleanup(settings: CaproverDiskCleanup): Promise<void> {
    await this.record(`setDiskCleanup:${settings.mostRecentLimit}:${settings.cronSchedule}:${settings.timezone}`);
  }

  async updateServerVersion(latestVersion: string): Promise<void> {
    await this.record(`updateServerVersion:${latestVersion}`);
  }

  async getNginxConfig(): Promise<CaproverNginxConfig> {
    await this.record("getNginxConfig");
    return {
      base: { hasCustomValue: false, customValue: "", defaultValue: "base default" },
      captain: { hasCustomValue: true, customValue: "captain custom", defaultValue: "captain default" },
    };
  }

  async setNginxConfig(baseConfig: string, captainConfig: string): Promise<void> {
    await this.record(`setNginxConfig:${baseConfig.length}:${captainConfig.length}`);
  }

  async getNetData(): Promise<CaproverNetData> {
    await this.record("getNetData");
    return { isEnabled: true, netDataUrl: "https://netdata.example.com", configuredChannels: ["slack"] };
  }

  async setNetDataEnabled(isEnabled: boolean): Promise<void> {
    await this.record(`setNetDataEnabled:${isEnabled}`);
  }

  async getGoAccess(): Promise<CaproverGoAccess> {
    await this.record("getGoAccess");
    return { isEnabled: true, rotationFrequencyCron: "0 0 * * *", logRetentionDays: 10 };
  }

  async setGoAccess(request: GoAccessRequest): Promise<void> {
    await this.record(`setGoAccess:${request.isEnabled}:${request.rotationFrequencyCron}:${request.logRetentionDays}`);
  }

  async listGoAccessReports(appName: string): Promise<CaproverGoAccessReport[]> {
    await this.record(`listGoAccessReports:${appName}`);
    return [{
      domainName: "web.example.com",
      reportName: "web.html",
      lastModifiedAt: "2026-01-01T00:00:00.000Z",
      reportUrl: "/goaccess/web.html",
    }];
  }

  async getTwoFactorStatus(): Promise<boolean> {
    await this.record("getTwoFactorStatus");
    return false;
  }

  async setPassword(newPassword: string): Promise<void> {
    await this.record(`setPassword:${newPassword.length}`);
  }

  async getProState(): Promise<CaproverProState> {
    await this.record("getProState");
    return { isFeatureFlagEnabled: true, isSubscribed: false };
  }

  async setProApiKey(apiKey: string): Promise<void> {
    await this.record(`setProApiKey:${apiKey.length}`);
  }

  async listProAlerts(): Promise<CaproverProAlert[]> {
    await this.record("listProAlerts");
    return [{ eventName: "AppBuildFailed", actionName: "email" }];
  }

  async listThemes(): Promise<CaproverTheme[]> {
    await this.record("listThemes");
    return [{ themeName: "default", isBuiltIn: true }, { themeName: "night", isBuiltIn: false }];
  }

  async getCurrentTheme(): Promise<string> {
    await this.record("getCurrentTheme");
    return "default";
  }

  async setCurrentTheme(themeName: string): Promise<void> {
    await this.record(`setCurrentTheme:${themeName}`);
  }

  async saveTheme(request: ThemeRequest): Promise<void> {
    await this.record(`saveTheme:${request.previousName}:${request.themeName}`);
  }

  async deleteTheme(themeName: string): Promise<void> {
    await this.record(`deleteTheme:${themeName}`);
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
    const { failureMessage, failOnCall } = this.options;
    if (failureMessage !== undefined && (failOnCall === undefined || failOnCall === call)) {
      return Promise.reject(new CaproverRequestError(failureMessage));
    }
    return Promise.resolve();
  }
}
