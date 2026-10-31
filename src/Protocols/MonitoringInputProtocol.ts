import type { ControlFields } from "@/Protocols/ControlProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";

export type SetNetDataInput = Pick<ControlFields, "dry_run"> & { is_enabled: boolean };

export type SetGoAccessInput = Pick<ControlFields, "dry_run"> & {
  is_enabled: boolean;
  rotation_frequency_cron?: string;
  log_retention_days?: number;
};

export type ListGoAccessReportsField = "domainName" | "reportName" | "lastModifiedAt" | "reportUrl";

export type ListGoAccessReportsInput = ListInput<ListGoAccessReportsField> & { app_name: string };
