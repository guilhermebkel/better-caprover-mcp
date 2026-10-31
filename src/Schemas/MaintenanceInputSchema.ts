import { z } from "zod";
import type {
  DeleteImagesInput,
  ListUnusedImagesField,
  ListUnusedImagesInput,
  SetDiskCleanupInput,
  SetNginxConfigInput,
  UpdateCaproverInput,
} from "@/Protocols/MaintenanceInputProtocol.ts";
import {
  ConfirmationTokenFieldSchema,
  DryRunFieldSchema,
  UserConfirmedFieldSchema,
} from "@/Schemas/ControlSchema.ts";
import { MAX_LIST_LIMIT } from "@/Schemas/ListSchema.ts";

const MAX_KEEP_RECENT = 100;
export const DEFAULT_KEEP_RECENT_COUNT = 2;
const MAX_IMAGE_IDS = 20;
const MAX_IMAGE_ID_LENGTH = 200;
const MAX_CRON_LENGTH = 100;
const MAX_FILTER_LENGTH = 200;
const MAX_TIMEZONE_LENGTH = 64;
const MAX_NGINX_CONFIG_LENGTH = 100_000;

const UNUSED_IMAGE_FIELDS: readonly ListUnusedImagesField[] = ["imageId", "tags"];

const KeepRecentFieldSchema = z.number().int().min(0).max(MAX_KEEP_RECENT);

export const ListUnusedImagesInputSchema: z.ZodType<ListUnusedImagesInput> = z.strictObject({
  keep_recent_count: KeepRecentFieldSchema.optional().describe(
    `How many recent images per app to treat as in use, from 0 to ${MAX_KEEP_RECENT}. `
    + `Default: ${DEFAULT_KEEP_RECENT_COUNT}.`,
  ),
  filter: z.string().min(1).max(MAX_FILTER_LENGTH).optional().describe(
    "Keep only images where an id or a tag contains this text, ignoring case. Default: keep all.",
  ),
  fields: z.array(z.enum(UNUSED_IMAGE_FIELDS)).min(1).max(UNUSED_IMAGE_FIELDS.length).optional().describe(
    "Names of the fields to return for each image, from: imageId, tags. Default: both.",
  ),
  limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional().describe(
    `How many of the images to return, from 1 to ${MAX_LIST_LIMIT}. Default: 50.`,
  ),
});

export const DeleteImagesInputSchema: z.ZodType<DeleteImagesInput> = z.strictObject({
  image_ids: z.array(z.string().min(1).max(MAX_IMAGE_ID_LENGTH)).min(1).max(MAX_IMAGE_IDS).describe(
    `Ids of the images to delete, as returned by \`list_unused_images\`. At most ${MAX_IMAGE_IDS}.`,
  ),
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});

export const SetDiskCleanupInputSchema: z.ZodType<SetDiskCleanupInput> = z.strictObject({
  keep_recent_count: KeepRecentFieldSchema.describe(
    `How many of the most recent images per app the cleanup keeps, from 0 to ${MAX_KEEP_RECENT}.`,
  ),
  cron_schedule: z.string().trim().min(1).max(MAX_CRON_LENGTH).describe(
    "When the cleanup runs, as a five-field cron expression, for example `0 2 * * *` for every day at 02:00.",
  ),
  timezone: z.string().trim().min(1).max(MAX_TIMEZONE_LENGTH).describe(
    "The IANA time zone of the schedule, for example `UTC` or `America/Sao_Paulo`.",
  ),
  dry_run: DryRunFieldSchema,
});

export const UpdateCaproverInputSchema: z.ZodType<UpdateCaproverInput> = z.strictObject({
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});

export const SetNginxConfigInputSchema: z.ZodType<SetNginxConfigInput> = z.strictObject({
  base_config: z.string().max(MAX_NGINX_CONFIG_LENGTH).optional().describe(
    "The new custom nginx template for the base config; an empty text restores the default. Omit to keep the current one.",
  ),
  captain_config: z.string().max(MAX_NGINX_CONFIG_LENGTH).optional().describe(
    "The new custom nginx template for the CapRover site; an empty text restores the default. Omit to keep the current one.",
  ),
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
}).refine((input) => input.base_config !== undefined || input.captain_config !== undefined, {
  message: "Provide `base_config`, `captain_config` or both.",
});

export const GetDiskUsageInputSchema: z.ZodType<Record<string, never>> = z.strictObject({});

export const GetDiskCleanupInputSchema: z.ZodType<Record<string, never>> = z.strictObject({});

export const GetNginxConfigInputSchema: z.ZodType<Record<string, never>> = z.strictObject({});
