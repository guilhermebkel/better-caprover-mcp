import type {
  CaproverApp,
  CaproverAppRuntime,
  CaproverBuildLogs,
  CaproverDiskSeverity,
  CaproverNodeDisks,
  CaproverSystemInfo,
  CaproverUnusedImage,
} from "@/Protocols/CaproverClientProtocol.ts";

export type FindingSeverity = "error" | "warning" | "info";

export type AppFindingKind
  = | "instance_count_zero" | "no_instances_running" | "build_failed" | "build_stuck" | "repeated_restarts"
    | "port_mismatch" | "custom_domain_without_ssl" | "forced_ssl_without_default_ssl" | "missing_env_var"
    | "image_tag_latest";

export type ServerFindingKind = "disk_low" | "unused_images" | "root_domain_without_ssl" | "caprover_update_available";

export type FindingKind = AppFindingKind | ServerFindingKind;

export type Finding = {
  severity: FindingSeverity;
  kind: FindingKind;
  appName?: string;
  statement: string;
  evidence: string[];
};

export type AppFacts = {
  app: CaproverApp;
  runtime?: CaproverAppRuntime;
  build?: CaproverBuildLogs;
  logLines?: string[];
};

export type ListeningPort = {
  port: number;
  line: string;
};

export type MissingEnvName = {
  name: string;
  line: string;
};

export type AppScreen = {
  findings: Finding[];
  isRead: boolean;
};

export type FactNameToSkipReason = Record<FactName, string | undefined>;

export type FactName = "runtime" | "build" | "logs";

export type AppRule = {
  kind: AppFindingKind;
  needs: FactName[];
  check: (facts: AppFacts) => Finding | undefined;
};

export type SkippedRule = {
  kind: AppFindingKind;
  reason: string;
};

export type AppDiagnosis = {
  findings: Finding[];
  rulesRun: AppFindingKind[];
  rulesSkipped: SkippedRule[];
};

export type ServerFacts = {
  system?: CaproverSystemInfo;
  disks?: CaproverNodeDisks[];
  unusedImages?: CaproverUnusedImage[];
};

export type DiskSeverityToFindingSeverity = Record<CaproverDiskSeverity, FindingSeverity | undefined>;

export type ScreenResult = {
  findings: Finding[];
  appsChecked: number;
  appsRead: number;
  isRuntimeSkipped: boolean;
};

export type FactRead<Value> = {
  value?: Value;
  skipReason?: string;
};

export type ServerScreen = {
  findings: Finding[];
  skippedChecks: string[];
};
