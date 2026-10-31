import { z } from "zod";
import type {
  ListGoAccessReportsField,
  ListGoAccessReportsInput,
  SetGoAccessInput,
  SetNetDataInput,
} from "@/Protocols/MonitoringInputProtocol.ts";
import { DryRunFieldSchema } from "@/Schemas/ControlSchema.ts";
import { MAX_LIST_LIMIT } from "@/Schemas/ListSchema.ts";

const REPORT_FIELDS: readonly ListGoAccessReportsField[] = ["domainName", "reportName", "lastModifiedAt", "reportUrl"];
const MAX_APP_NAME_LENGTH = 100;
const MAX_FILTER_LENGTH = 200;
const MAX_CRON_LENGTH = 100;
const MAX_RETENTION_DAYS = 3650;

export const GetNetDataInputSchema: z.ZodType<Record<string, never>> = z.strictObject({});

export const SetNetDataInputSchema: z.ZodType<SetNetDataInput> = z.strictObject({
  is_enabled: z.boolean().describe("True starts the NetData monitoring container; false stops it. Alert settings stay as they are."),
  dry_run: DryRunFieldSchema,
});

export const GetGoAccessInputSchema: z.ZodType<Record<string, never>> = z.strictObject({});

export const SetGoAccessInputSchema: z.ZodType<SetGoAccessInput> = z.strictObject({
  is_enabled: z.boolean().describe("True turns on the GoAccess web traffic reports; false turns them off."),
  rotation_frequency_cron: z.string().trim().min(1).max(MAX_CRON_LENGTH).optional().describe(
    "When the logs rotate, as a five-field cron expression, for example `0 0 * * *`. Omit to keep the current schedule.",
  ),
  log_retention_days: z.number().int().min(1).max(MAX_RETENTION_DAYS).optional().describe(
    `How many days of logs to keep, from 1 to ${MAX_RETENTION_DAYS}. Omit to keep the current value.`,
  ),
  dry_run: DryRunFieldSchema,
});

export const ListGoAccessReportsInputSchema: z.ZodType<ListGoAccessReportsInput> = z.strictObject({
  app_name: z.string().min(1).max(MAX_APP_NAME_LENGTH).describe("An app name as returned by `list_apps`."),
  filter: z.string().min(1).max(MAX_FILTER_LENGTH).optional().describe(
    "Keep only reports where any text field contains this text, ignoring case. Default: keep all.",
  ),
  fields: z.array(z.enum(REPORT_FIELDS)).min(1).max(REPORT_FIELDS.length).optional().describe(
    `Names of the fields to return for each report, from: ${REPORT_FIELDS.join(", ")}. Default: all of them.`,
  ),
  limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional().describe(
    `How many of the reports to return, from 1 to ${MAX_LIST_LIMIT}. Default: 50.`,
  ),
});
