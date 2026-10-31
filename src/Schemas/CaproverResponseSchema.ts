import { z } from "zod";
import type {
  CaproverApp,
  CaproverAppList,
  CaproverAppRuntime,
  CaproverBuildLogs,
  CaproverDiskCleanup,
  CaproverDiskSeverity,
  CaproverGoAccess,
  CaproverGoAccessReport,
  CaproverLoadBalancer,
  CaproverNginxConfig,
  CaproverNetData,
  CaproverNginxPart,
  CaproverNode,
  CaproverNodeDisks,
  CaproverNodeRole,
  CaproverOneClickApp,
  CaproverOneClickProgress,
  CaproverOneClickTemplate,
  CaproverProAlert,
  CaproverProject,
  CaproverProState,
  CaproverRegistry,
  CaproverRegistryList,
  CaproverRegistryType,
  CaproverRuntimeStatus,
  CaproverSystemInfo,
  CaproverTask,
  CaproverTaskState,
  CaproverTheme,
  CaproverUnusedImage,
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

const DISK_SEVERITIES: readonly CaproverDiskSeverity[] = ["normal", "warning", "critical", "unknown"];

const NODE_ROLES: readonly CaproverNodeRole[] = ["manager", "worker", "unknown"];

const REGISTRY_TYPES: readonly CaproverRegistryType[] = ["LOCAL_REG", "REMOTE_REG"];

export const AppsRuntimeResponseSchema: z.ZodType<CaproverAppRuntime[]> = z.object({
  apps: z.array(AppRuntimeResponseSchema),
}).transform((response) => response.apps);

export const ProjectsResponseSchema: z.ZodType<CaproverProject[]> = z.object({
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().default(""),
    parentProjectId: z.string().nullish(),
  })),
}).transform((response) => response.projects.map((project): CaproverProject => ({
  projectId: project.id,
  name: project.name,
  description: project.description,
  parentProjectId: project.parentProjectId ?? undefined,
})));

export const ProjectResponseSchema: z.ZodType<CaproverProject> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  parentProjectId: z.string().nullish(),
}).transform((project): CaproverProject => ({
  projectId: project.id,
  name: project.name,
  description: project.description,
  parentProjectId: project.parentProjectId ?? undefined,
}));

export const OneClickTemplateResponseSchema: z.ZodType<CaproverOneClickTemplate> = z.object({
  appTemplate: z.object({
    caproverOneClickApp: z.object({
      displayName: z.string().default(""),
      variables: z.array(z.object({
        id: z.string(),
        label: z.string().default(""),
        defaultValue: z.string().optional(),
        description: z.string().optional(),
      })).default([]),
    }),
  }).loose(),
}).transform((response): CaproverOneClickTemplate => ({
  displayName: response.appTemplate.caproverOneClickApp.displayName,
  variables: response.appTemplate.caproverOneClickApp.variables.map((variable) => ({
    variableId: variable.id,
    label: variable.label,
    defaultValue: variable.defaultValue,
    description: variable.description,
  })),
  template: response.appTemplate,
}));

export const OneClickReposResponseSchema: z.ZodType<string[]> = z.object({
  urls: z.array(z.string()),
}).transform((response) => response.urls);

export const OneClickJobResponseSchema: z.ZodType<string> = z.object({
  jobId: z.string(),
}).transform((response) => response.jobId);

export const OneClickProgressResponseSchema: z.ZodType<CaproverOneClickProgress> = z.object({
  steps: z.array(z.string()).default([]),
  currentStep: z.number().default(0),
  error: z.string().nullish(),
  successMessage: z.string().nullish(),
}).transform((progress): CaproverOneClickProgress => ({
  steps: progress.steps,
  currentStep: progress.currentStep,
  errorMessage: progress.error ?? undefined,
  successMessage: progress.successMessage ?? undefined,
}));

export const RegistriesResponseSchema: z.ZodType<CaproverRegistryList> = z.object({
  registries: z.array(z.object({
    id: z.string(),
    registryUser: z.string().default(""),
    registryDomain: z.string().default(""),
    registryImagePrefix: z.string().default(""),
    registryType: z.string().default("REMOTE_REG"),
  })),
  defaultPushRegistryId: z.string().nullish(),
}).transform((response): CaproverRegistryList => ({
  registries: response.registries.map((registry): CaproverRegistry => ({
    registryId: registry.id,
    registryUser: registry.registryUser,
    registryDomain: registry.registryDomain,
    registryImagePrefix: registry.registryImagePrefix,
    registryType: REGISTRY_TYPES.find((known) => known === registry.registryType) ?? "REMOTE_REG",
  })),
  defaultPushRegistryId: response.defaultPushRegistryId ?? undefined,
}));

export const NodesResponseSchema: z.ZodType<CaproverNode[]> = z.object({
  nodes: z.array(z.object({
    nodeId: z.string(),
    type: z.string().default("unknown"),
    isLeader: z.boolean().default(false),
    hostname: z.string().default(""),
    architecture: z.string().default(""),
    operatingSystem: z.string().default(""),
    memoryBytes: z.number().default(0),
    dockerEngineVersion: z.string().default(""),
    ip: z.string().default(""),
    state: z.string().default(""),
    status: z.string().default(""),
  })),
}).transform((response) => response.nodes.map((node): CaproverNode => ({
  nodeId: node.nodeId,
  nodeRole: NODE_ROLES.find((known) => known === node.type) ?? "unknown",
  isLeader: node.isLeader,
  hostname: node.hostname,
  architecture: node.architecture,
  operatingSystem: node.operatingSystem,
  memoryBytes: node.memoryBytes,
  dockerEngineVersion: node.dockerEngineVersion,
  ipAddress: node.ip,
  nodeState: node.state,
  availability: node.status,
})));

export const LoadBalancerResponseSchema: z.ZodType<CaproverLoadBalancer> = z.object({
  activeConnections: z.number().default(0),
  accepted: z.number().default(0),
  handled: z.number().default(0),
  total: z.number().default(0),
  reading: z.number().default(0),
  writing: z.number().default(0),
  waiting: z.number().default(0),
}).transform((info): CaproverLoadBalancer => ({
  activeConnections: info.activeConnections,
  acceptedConnections: info.accepted,
  handledConnections: info.handled,
  totalRequests: info.total,
  readingConnections: info.reading,
  writingConnections: info.writing,
  waitingConnections: info.waiting,
}));

export const DiskUsageResponseSchema: z.ZodType<CaproverNodeDisks[]> = z.object({
  nodes: z.array(z.object({
    nodeId: z.string(),
    hostname: z.string().default(""),
    disks: z.array(z.object({
      totalBytes: z.number(),
      usedBytes: z.number(),
      availableBytes: z.number(),
      severity: z.string().default("unknown"),
    })).default([]),
  })).default([]),
}).transform((response) => response.nodes.map((node): CaproverNodeDisks => ({
  nodeId: node.nodeId,
  hostname: node.hostname,
  disks: node.disks.map((disk) => ({
    totalBytes: disk.totalBytes,
    usedBytes: disk.usedBytes,
    availableBytes: disk.availableBytes,
    severity: DISK_SEVERITIES.find((known) => known === disk.severity) ?? "unknown",
  })),
})));

export const UnusedImagesResponseSchema: z.ZodType<CaproverUnusedImage[]> = z.object({
  unusedImages: z.array(z.object({ id: z.string(), tags: z.array(z.string()).nullish() })),
}).transform((response) => response.unusedImages.map((image): CaproverUnusedImage => ({
  imageId: image.id,
  tags: image.tags ?? [],
})));

export const DiskCleanupResponseSchema: z.ZodType<CaproverDiskCleanup> = z.object({
  mostRecentLimit: z.number(),
  cronSchedule: z.string(),
  timezone: z.string(),
});

const NginxPartResponseSchema: z.ZodType<CaproverNginxPart> = z.object({
  byDefault: z.string().default(""),
  customValue: z.string().default(""),
}).transform((part): CaproverNginxPart => ({
  hasCustomValue: part.customValue !== "",
  customValue: part.customValue,
  defaultValue: part.byDefault,
}));

export const NginxConfigResponseSchema: z.ZodType<CaproverNginxConfig> = z.object({
  baseConfig: NginxPartResponseSchema,
  captainConfig: NginxPartResponseSchema,
}).transform((config): CaproverNginxConfig => ({ base: config.baseConfig, captain: config.captainConfig }));

const NetDataTextSchema = z.string().default("");

export const RawNetDataResponseSchema = z.object({
  isEnabled: z.boolean().default(false),
  netDataUrl: NetDataTextSchema,
  data: z.object({
    smtp: z.object({
      to: NetDataTextSchema,
      hostname: NetDataTextSchema,
      server: NetDataTextSchema,
      port: NetDataTextSchema,
      allowNonTls: NetDataTextSchema,
      username: NetDataTextSchema,
      password: NetDataTextSchema,
    }).default({ to: "", hostname: "", server: "", port: "", allowNonTls: "", username: "", password: "" }),
    slack: z.object({ hook: NetDataTextSchema, channel: NetDataTextSchema }).default({ hook: "", channel: "" }),
    telegram: z.object({ chatId: NetDataTextSchema, botToken: NetDataTextSchema }).default({ chatId: "", botToken: "" }),
    pushBullet: z.object({ apiToken: NetDataTextSchema, fallbackEmail: NetDataTextSchema }).default({
      apiToken: "",
      fallbackEmail: "",
    }),
  }).default({
    smtp: { to: "", hostname: "", server: "", port: "", allowNonTls: "", username: "", password: "" },
    slack: { hook: "", channel: "" },
    telegram: { chatId: "", botToken: "" },
    pushBullet: { apiToken: "", fallbackEmail: "" },
  }),
});

export const NetDataResponseSchema: z.ZodType<CaproverNetData> = RawNetDataResponseSchema.transform(
  (info): CaproverNetData => {
    const groups = Object.entries(info.data);
    const configured = groups.filter(([, fields]) => Object.values(fields).some((field) => field !== ""));
    return {
      isEnabled: info.isEnabled,
      netDataUrl: info.netDataUrl,
      configuredChannels: configured.map(([channel]) => channel),
    };
  },
);

export const GoAccessResponseSchema: z.ZodType<CaproverGoAccess> = z.object({
  isEnabled: z.boolean().default(false),
  data: z.object({
    rotationFrequencyCron: z.string().default(""),
    logRetentionDays: z.number().optional(),
  }).default({ rotationFrequencyCron: "" }),
}).transform((info): CaproverGoAccess => ({
  isEnabled: info.isEnabled,
  rotationFrequencyCron: info.data.rotationFrequencyCron,
  logRetentionDays: info.data.logRetentionDays,
}));

export const GoAccessReportsResponseSchema: z.ZodType<CaproverGoAccessReport[]> = z.array(z.object({
  domainName: z.string(),
  name: z.string(),
  lastModifiedTime: z.string().default(""),
  url: z.string(),
})).transform((reports) => reports.map((report): CaproverGoAccessReport => ({
  domainName: report.domainName,
  reportName: report.name,
  lastModifiedAt: report.lastModifiedTime,
  reportUrl: report.url,
})));

export const TwoFactorResponseSchema: z.ZodType<boolean> = z.object({
  isEnabled: z.boolean().default(false),
}).transform((status) => status.isEnabled);

export const ProStateResponseSchema: z.ZodType<CaproverProState> = z.object({
  proFeaturesState: z.object({
    isFeatureFlagEnabled: z.boolean().default(false),
    isSubscribed: z.boolean().default(false),
  }),
}).transform((response) => response.proFeaturesState);

export const ProAlertsResponseSchema: z.ZodType<CaproverProAlert[]> = z.object({
  proConfigs: z.object({
    alerts: z.array(z.object({
      event: z.string(),
      action: z.object({ actionType: z.string() }),
    })).default([]),
  }),
}).transform((response) => response.proConfigs.alerts.map((alert): CaproverProAlert => ({
  eventName: alert.event,
  actionName: alert.action.actionType,
})));

export const ThemesResponseSchema: z.ZodType<CaproverTheme[]> = z.object({
  themes: z.array(z.object({ name: z.string(), builtIn: z.boolean().optional() })).nullish(),
}).transform((response) => (response.themes ?? []).map((theme): CaproverTheme => ({
  themeName: theme.name,
  isBuiltIn: theme.builtIn === true,
})));

export const CurrentThemeResponseSchema: z.ZodType<string> = z.object({
  theme: z.object({ name: z.string() }),
}).transform((response) => response.theme.name);
