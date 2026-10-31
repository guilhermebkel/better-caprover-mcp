import { z } from "zod";
import type {
  CaproverApp,
  CaproverAppList,
  CaproverAppRuntime,
  CaproverBuildLogs,
  CaproverOneClickApp,
  CaproverRuntimeStatus,
  CaproverSystemInfo,
  CaproverTask,
  CaproverTaskState,
  CaptainErrorBody,
} from "@/Protocols/CaproverClientProtocol.ts";

const RUNTIME_STATUSES: readonly CaproverRuntimeStatus[] = ["running", "degraded", "stopped", "unavailable", "unknown"];

const TASK_STATES: readonly CaproverTaskState[] = [
  "new", "allocated", "pending", "assigned", "accepted", "ready", "preparing", "starting",
  "running", "complete", "shutdown", "failed", "rejected", "orphaned", "remove", "unknown",
];

const RuntimeStatusSchema: z.ZodType<CaproverRuntimeStatus> = z.string().transform(
  (status): CaproverRuntimeStatus => RUNTIME_STATUSES.find((known) => known === status) ?? "unknown",
);

const TaskStateSchema: z.ZodType<CaproverTaskState> = z.string().transform(
  (state): CaproverTaskState => TASK_STATES.find((known) => known === state) ?? "unknown",
);

const AppResponseSchema = z.object({
  appName: z.string(),
  instanceCount: z.number(),
  deployedVersion: z.number(),
  hasPersistentData: z.boolean().default(false),
  notExposeAsWebApp: z.boolean().default(false),
  forceSsl: z.boolean().default(false),
  hasDefaultSubDomainSsl: z.boolean().default(false),
  containerHttpPort: z.number().optional(),
  isAppBuilding: z.boolean().default(false),
  customDomain: z.array(z.object({ publicDomain: z.string(), hasSsl: z.boolean().default(false) })).default([]),
  envVars: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
  ports: z.array(z.object({ containerPort: z.number(), hostPort: z.number() })).default([]),
  volumes: z.array(z.object({
    containerPath: z.string(),
    volumeName: z.string().optional(),
    hostPath: z.string().optional(),
  })).default([]),
  versions: z.array(z.object({ version: z.number(), deployedImageName: z.string().optional() })).default([]),
});

export const AppListResponseSchema: z.ZodType<CaproverAppList> = z.object({
  rootDomain: z.string(),
  appDefinitions: z.array(AppResponseSchema),
}).transform((response): CaproverAppList => ({
  rootDomain: response.rootDomain,
  apps: response.appDefinitions.map((app): CaproverApp => {
    const scheme = app.hasDefaultSubDomainSsl ? "https" : "http";
    const deployed = app.versions.find((version) => version.version === app.deployedVersion);
    return {
      appName: app.appName,
      url: `${scheme}://${app.appName}.${response.rootDomain}`,
      instanceCount: app.instanceCount,
      deployedVersion: app.deployedVersion,
      imageName: deployed?.deployedImageName,
      hasPersistentData: app.hasPersistentData,
      isExposedAsWebApp: !app.notExposeAsWebApp,
      hasForcedSsl: app.forceSsl,
      hasDefaultDomainSsl: app.hasDefaultSubDomainSsl,
      containerHttpPort: app.containerHttpPort,
      isBuilding: app.isAppBuilding,
      customDomains: app.customDomain,
      envVars: app.envVars,
      ports: app.ports,
      volumes: app.volumes,
    };
  }),
}));

export const SystemInfoResponseSchema: z.ZodType<CaproverSystemInfo> = z.object({
  captain: z.object({
    rootDomain: z.string(),
    hasRootSsl: z.boolean().default(false),
    forceSsl: z.boolean().default(false),
  }),
  version: z.object({ currentVersion: z.string(), latestVersion: z.string(), canUpdate: z.boolean() }),
}).transform((response): CaproverSystemInfo => ({
  rootDomain: response.captain.rootDomain,
  hasRootSsl: response.captain.hasRootSsl,
  isSslForced: response.captain.forceSsl,
  currentVersion: response.version.currentVersion,
  latestVersion: response.version.latestVersion,
  canUpdate: response.version.canUpdate,
}));

const TaskResponseSchema: z.ZodType<CaproverTask> = z.object({
  state: TaskStateSchema,
  image: z.string().default(""),
  message: z.string().default(""),
  error: z.string().nullish(),
  exitCode: z.number().nullish(),
}).transform((task): CaproverTask => ({
  state: task.state,
  image: task.image,
  message: task.message,
  error: task.error ?? undefined,
  exitCode: task.exitCode ?? undefined,
}));

export const AppRuntimeResponseSchema: z.ZodType<CaproverAppRuntime> = z.object({
  appName: z.string(),
  status: RuntimeStatusSchema,
  desiredInstances: z.number().nullish(),
  runningInstances: z.number().nullish(),
  currentTasks: z.array(TaskResponseSchema).default([]),
  latestFailure: z.object({ occurredAt: z.string().nullish(), error: z.string() }).nullish(),
  error: z.string().nullish(),
}).transform((runtime): CaproverAppRuntime => ({
  appName: runtime.appName,
  status: runtime.status,
  desiredInstances: runtime.desiredInstances ?? undefined,
  runningInstances: runtime.runningInstances ?? undefined,
  tasks: runtime.currentTasks,
  latestFailure: runtime.latestFailure
    ? { occurredAt: runtime.latestFailure.occurredAt ?? undefined, error: runtime.latestFailure.error }
    : undefined,
  collectionError: runtime.error ?? undefined,
}));

export const AppLogsResponseSchema: z.ZodType<string> = z.object({ logs: z.string() }).transform(
  (response) => response.logs,
);

export const BuildLogsResponseSchema: z.ZodType<CaproverBuildLogs> = z.object({
  isAppBuilding: z.boolean(),
  isBuildFailed: z.boolean(),
  logs: z.object({ lines: z.array(z.string()) }),
}).transform((response): CaproverBuildLogs => ({
  isBuilding: response.isAppBuilding,
  isFailed: response.isBuildFailed,
  lines: response.logs.lines,
}));

export const OneClickAppsResponseSchema: z.ZodType<CaproverOneClickApp[]> = z.object({
  oneClickApps: z.array(z.object({
    name: z.string(),
    displayName: z.string().default(""),
    description: z.string().default(""),
  })),
}).transform((response) => response.oneClickApps);

export const CaptainErrorSchema: z.ZodType<CaptainErrorBody> = z.object({
  captainStatus: z.number(),
  captainMessage: z.string().optional(),
});
