export type CaproverConfig = {
  url: string;
  password: string;
};

export type CaproverSystemInfo = {
  rootDomain: string;
  hasRootSsl: boolean;
  isSslForced: boolean;
  currentVersion: string;
  latestVersion: string;
  canUpdate: boolean;
};

export type CaproverEnvVar = {
  key: string;
  value: string;
};

export type CaproverPortMapping = {
  containerPort: number;
  hostPort: number;
};

export type CaproverVolume = {
  containerPath: string;
  volumeName?: string;
  hostPath?: string;
};

export type CaproverCustomDomain = {
  publicDomain: string;
  hasSsl: boolean;
};

export type CaproverApp = {
  appName: string;
  url: string;
  instanceCount: number;
  deployedVersion: number;
  imageName?: string;
  hasPersistentData: boolean;
  isExposedAsWebApp: boolean;
  hasForcedSsl: boolean;
  hasDefaultDomainSsl: boolean;
  containerHttpPort?: number;
  isBuilding: boolean;
  customDomains: CaproverCustomDomain[];
  envVars: CaproverEnvVar[];
  ports: CaproverPortMapping[];
  volumes: CaproverVolume[];
};

export type CaproverAppList = {
  rootDomain: string;
  apps: CaproverApp[];
};

export type CaproverRuntimeStatus = "running" | "degraded" | "stopped" | "unavailable" | "unknown";

export type CaproverTaskState
  = | "new" | "allocated" | "pending" | "assigned" | "accepted" | "ready" | "preparing" | "starting"
    | "running" | "complete" | "shutdown" | "failed" | "rejected" | "orphaned" | "remove" | "unknown";

export type CaproverTask = {
  state: CaproverTaskState;
  image: string;
  message: string;
  error?: string;
  exitCode?: number;
};

export type CaproverFailure = {
  occurredAt?: string;
  error: string;
};

export type CaproverAppRuntime = {
  appName: string;
  status: CaproverRuntimeStatus;
  desiredInstances?: number;
  runningInstances?: number;
  tasks: CaproverTask[];
  latestFailure?: CaproverFailure;
  collectionError?: string;
};

export type CaproverBuildLogs = {
  isBuilding: boolean;
  isFailed: boolean;
  lines: string[];
};

export type CaproverOneClickApp = {
  name: string;
  displayName: string;
  description: string;
};

export type NewAppRequest = {
  appName: string;
  hasPersistentData: boolean;
};

export type CaproverProject = {
  projectId: string;
  name: string;
  description: string;
  parentProjectId?: string;
};

export type NewProjectRequest = {
  name: string;
  description: string;
  parentProjectId?: string;
};

export type CaproverOneClickVariable = {
  variableId: string;
  label: string;
  defaultValue?: string;
  description?: string;
};

export type CaproverOneClickTemplate = {
  displayName: string;
  variables: CaproverOneClickVariable[];
  template: unknown;
};

export type OneClickVariableValue = {
  variableId: string;
  value: string;
};

export type CaproverOneClickProgress = {
  steps: string[];
  currentStep: number;
  errorMessage?: string;
  successMessage?: string;
};

export type CaproverRegistryType = "LOCAL_REG" | "REMOTE_REG";

export type CaproverRegistry = {
  registryId: string;
  registryUser: string;
  registryDomain: string;
  registryImagePrefix: string;
  registryType: CaproverRegistryType;
};

export type CaproverRegistryList = {
  registries: CaproverRegistry[];
  defaultPushRegistryId?: string;
};

export type RegistryRequest = {
  registryId: string;
  registryUser: string;
  registryPassword: string;
  registryDomain: string;
  registryImagePrefix: string;
};

export type CaproverNodeRole = "manager" | "worker" | "unknown";

export type CaproverNode = {
  nodeId: string;
  nodeRole: CaproverNodeRole;
  isLeader: boolean;
  hostname: string;
  architecture: string;
  operatingSystem: string;
  memoryBytes: number;
  dockerEngineVersion: string;
  ipAddress: string;
  nodeState: string;
  availability: string;
};

export type NewNodeRequest = {
  nodeRole: "manager" | "worker";
  privateKey: string;
  remoteNodeIpAddress: string;
  sshPort: string;
  sshUser: string;
  captainIpAddress: string;
};

export type CaproverLoadBalancer = {
  activeConnections: number;
  acceptedConnections: number;
  handledConnections: number;
  totalRequests: number;
  readingConnections: number;
  writingConnections: number;
  waitingConnections: number;
};

export type CaproverDiskSeverity = "normal" | "warning" | "critical" | "unknown";

export type CaproverDisk = {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  severity: CaproverDiskSeverity;
};

export type CaproverNodeDisks = {
  nodeId: string;
  hostname: string;
  disks: CaproverDisk[];
};

export type CaproverUnusedImage = {
  imageId: string;
  tags: string[];
};

export type CaproverDiskCleanup = {
  mostRecentLimit: number;
  cronSchedule: string;
  timezone: string;
};

export type CaproverNginxPart = {
  hasCustomValue: boolean;
  customValue: string;
  defaultValue: string;
};

export type CaproverNginxConfig = {
  base: CaproverNginxPart;
  captain: CaproverNginxPart;
};

export type CaproverNetData = {
  isEnabled: boolean;
  netDataUrl: string;
  configuredChannels: string[];
};

export type CaproverGoAccess = {
  isEnabled: boolean;
  rotationFrequencyCron: string;
  logRetentionDays?: number;
};

export type GoAccessRequest = {
  isEnabled: boolean;
  rotationFrequencyCron: string;
  logRetentionDays: number;
};

export type CaproverGoAccessReport = {
  domainName: string;
  reportName: string;
  lastModifiedAt: string;
  reportUrl: string;
};

export type CaproverProState = {
  isFeatureFlagEnabled: boolean;
  isSubscribed: boolean;
};

export type CaproverProAlert = {
  eventName: string;
  actionName: string;
};

export type CaproverTheme = {
  themeName: string;
  isBuiltIn: boolean;
};

export type ThemeRequest = {
  previousName: string;
  themeName: string;
  content: string;
};

export interface CaproverClientPort {
  getSystemInfo(): Promise<CaproverSystemInfo>;
  listApps(): Promise<CaproverAppList>;
  getAppRuntime(appName: string): Promise<CaproverAppRuntime>;
  getAppLogs(appName: string): Promise<string>;
  getBuildLogs(appName: string): Promise<CaproverBuildLogs>;
  listOneClickApps(): Promise<CaproverOneClickApp[]>;
  createApp(request: NewAppRequest): Promise<void>;
  deployImage(appName: string, imageName: string): Promise<void>;
  setEnvVars(appName: string, envVars: CaproverEnvVar[]): Promise<void>;
  setInstanceCount(appName: string, instanceCount: number): Promise<void>;
  addCustomDomain(appName: string, domain: string): Promise<void>;
  enableSsl(appName: string, domain: string | undefined): Promise<void>;
  deleteApp(appName: string, volumeNames: string[]): Promise<void>;
  listAppsRuntime(): Promise<CaproverAppRuntime[]>;
  renameApp(appName: string, newAppName: string): Promise<void>;
  startBuild(webhookPath: string): Promise<void>;
  uploadAppArchive(appName: string, archive: Uint8Array): Promise<void>;
  removeCustomDomain(appName: string, domain: string): Promise<void>;
  updateRootDomain(rootDomain: string, isForced: boolean): Promise<void>;
  enableRootSsl(emailAddress: string): Promise<void>;
  setForceSsl(isEnabled: boolean): Promise<void>;
  listProjects(): Promise<CaproverProject[]>;
  createProject(request: NewProjectRequest): Promise<CaproverProject>;
  updateProject(project: CaproverProject): Promise<void>;
  deleteProjects(projectIds: string[]): Promise<void>;
  getOneClickApp(templateName: string): Promise<CaproverOneClickTemplate>;
  listOneClickRepos(): Promise<string[]>;
  addOneClickRepo(repositoryUrl: string): Promise<void>;
  deleteOneClickRepo(repositoryUrl: string): Promise<void>;
  startOneClickDeploy(templateName: string, values: OneClickVariableValue[]): Promise<string>;
  getOneClickDeployProgress(jobId: string): Promise<CaproverOneClickProgress>;
  listRegistries(): Promise<CaproverRegistryList>;
  addRegistry(request: RegistryRequest): Promise<void>;
  updateRegistry(request: RegistryRequest): Promise<void>;
  deleteRegistry(registryId: string): Promise<void>;
  setDefaultPushRegistry(registryId: string): Promise<void>;
  enableSelfHostedRegistry(): Promise<void>;
  disableSelfHostedRegistry(): Promise<void>;
  listNodes(): Promise<CaproverNode[]>;
  addNode(request: NewNodeRequest): Promise<void>;
  getLoadBalancer(): Promise<CaproverLoadBalancer>;
  getDiskUsage(): Promise<CaproverNodeDisks[]>;
  listUnusedImages(mostRecentLimit: number): Promise<CaproverUnusedImage[]>;
  deleteImages(imageIds: string[]): Promise<void>;
  getDiskCleanup(): Promise<CaproverDiskCleanup>;
  setDiskCleanup(settings: CaproverDiskCleanup): Promise<void>;
  updateServerVersion(latestVersion: string): Promise<void>;
  getNginxConfig(): Promise<CaproverNginxConfig>;
  setNginxConfig(baseConfig: string, captainConfig: string): Promise<void>;
  getNetData(): Promise<CaproverNetData>;
  setNetDataEnabled(isEnabled: boolean): Promise<void>;
  getGoAccess(): Promise<CaproverGoAccess>;
  setGoAccess(request: GoAccessRequest): Promise<void>;
  listGoAccessReports(appName: string): Promise<CaproverGoAccessReport[]>;
  getTwoFactorStatus(): Promise<boolean>;
  setPassword(newPassword: string): Promise<void>;
  getProState(): Promise<CaproverProState>;
  setProApiKey(apiKey: string): Promise<void>;
  listProAlerts(): Promise<CaproverProAlert[]>;
  listThemes(): Promise<CaproverTheme[]>;
  getCurrentTheme(): Promise<string>;
  setCurrentTheme(themeName: string): Promise<void>;
  saveTheme(request: ThemeRequest): Promise<void>;
  deleteTheme(themeName: string): Promise<void>;
}

export type CaptainErrorBody = {
  captainStatus: number;
  captainMessage?: string;
};
