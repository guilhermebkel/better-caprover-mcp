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
}

export type CaptainErrorBody = {
  captainStatus: number;
  captainMessage?: string;
};
