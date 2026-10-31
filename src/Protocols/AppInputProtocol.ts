import type { ControlFields } from "@/Protocols/ControlProtocol.ts";

export type ResponseFormat = "concise" | "detailed";

export type GetOverviewInput = { dry_run?: undefined };

export type GetAccessInput = { dry_run?: undefined };

export type ListAppsInput = {
  name_contains?: string;
  limit?: number;
  response_format?: ResponseFormat;
};

export type AppNameInput = { app_name: string };

export type GetLogsInput = AppNameInput & { lines?: number };

export type ListOneClickAppsInput = {
  query?: string;
  limit?: number;
};

export type CreateAppInput = AppNameInput & Pick<ControlFields, "dry_run"> & { has_persistent_data?: boolean };

export type DeployImageInput = AppNameInput & Pick<ControlFields, "dry_run"> & { image_name: string };

export type SetEnvVarsInput = AppNameInput & Pick<ControlFields, "dry_run"> & {
  env_vars?: string;
  remove_keys?: string[];
};

export type ScaleAppInput = AppNameInput & Pick<ControlFields, "dry_run"> & { instance_count: number };

export type AddCustomDomainInput = AppNameInput & Pick<ControlFields, "dry_run"> & { domain: string };

export type EnableSslInput = AppNameInput & Pick<ControlFields, "dry_run"> & { domain?: string };

export type DeleteAppInput = AppNameInput & ControlFields & { delete_volumes?: boolean };

export type ListAppsRuntimeField = "appName" | "status" | "desiredInstances" | "runningInstances" | "collectionError";

export type RenameAppInput = AppNameInput & Pick<ControlFields, "dry_run"> & { new_app_name: string };

export type StartBuildInput = Pick<ControlFields, "dry_run"> & { webhook_path: string };

export type DeployArchiveInput = AppNameInput & Pick<ControlFields, "dry_run"> & { source_archive: string };

export type RedeployTarget = {
  appName: string;
  imageName: string;
};

export type FindIssuesInput = {
  name_contains?: string;
  limit?: number;
};

export type RedeployAppInput = AppNameInput & Pick<ControlFields, "dry_run">;

export type BulkEnvUpdateInput = Pick<ControlFields, "dry_run"> & {
  app_names: string[];
  env_vars?: string;
  remove_keys?: string[];
};
