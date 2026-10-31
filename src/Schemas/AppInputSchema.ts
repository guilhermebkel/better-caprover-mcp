import { z } from "zod";
import type {
  AddCustomDomainInput,
  AppNameInput,
  CreateAppInput,
  DeleteAppInput,
  DeployImageInput,
  EnableSslInput,
  GetLogsInput,
  GetAccessInput,
  GetOverviewInput,
  DeployArchiveInput,
  RenameAppInput,
  StartBuildInput,
  ListAppsInput,
  ListAppsRuntimeField,
  ListOneClickAppsInput,
  ScaleAppInput,
  SetEnvVarsInput,
  FindIssuesInput,
  RedeployAppInput,
  BulkEnvUpdateInput,
} from "@/Protocols/AppInputProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import { buildListInputSchema, MAX_LIST_LIMIT } from "@/Schemas/ListSchema.ts";
import {
  ConfirmationTokenFieldSchema,
  DryRunFieldSchema,
  UserConfirmedFieldSchema,
} from "@/Schemas/ControlSchema.ts";

export const MAX_LOG_LINES = 500;
export const MAX_INSTANCE_COUNT = 50;
export const MAX_ENV_VARS_LENGTH = 20_000;
export const MAX_REMOVE_KEYS = 20;
export const MAX_BULK_APPS = 20;
const MAX_APP_NAME_LENGTH = 100;
const MAX_NEW_APP_NAME_LENGTH = 50;
const MAX_TEXT_LENGTH = 200;
const MAX_IMAGE_NAME_LENGTH = 255;
const MAX_DOMAIN_LENGTH = 253;
const MAX_ENV_KEY_LENGTH = 128;
const MAX_WEBHOOK_PATH_LENGTH = 300;
export const MAX_ARCHIVE_BASE64_LENGTH = 5_000_000;

export const AppNameFieldSchema = z.string().min(1).max(MAX_APP_NAME_LENGTH).describe(
  "An app name as returned by `list_apps`.",
);

const LimitFieldSchema = z.number().int().min(1).max(MAX_LIST_LIMIT).optional().describe(
  `How many items to return, from 1 to ${MAX_LIST_LIMIT}. Default: 50.`,
);

const LinesFieldSchema = z.number().int().min(1).max(MAX_LOG_LINES).optional().describe(
  `How many of the last lines to return, from 1 to ${MAX_LOG_LINES}. Default: 100.`,
);

export const DomainFieldSchema = z.string().trim().toLowerCase().min(1).max(MAX_DOMAIN_LENGTH).regex(
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/,
);

export const GetOverviewInputSchema: z.ZodType<GetOverviewInput> = z.strictObject({});

export const GetAccessInputSchema: z.ZodType<GetAccessInput> = z.strictObject({});

export const ListAppsInputSchema: z.ZodType<ListAppsInput> = z.strictObject({
  name_contains: z.string().min(1).max(MAX_TEXT_LENGTH).optional().describe(
    "Keep only apps whose name contains this text, ignoring case. Default: keep all apps.",
  ),
  limit: LimitFieldSchema,
  response_format: z.enum(["concise", "detailed"]).optional().describe(
    "`concise` returns name, URL, instances and image. `detailed` adds domains, ports, volumes and env var keys. Default: `concise`.",
  ),
});

export const AppNameInputSchema: z.ZodType<AppNameInput> = z.strictObject({
  app_name: AppNameFieldSchema,
});

export const GetLogsInputSchema: z.ZodType<GetLogsInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  lines: LinesFieldSchema,
});

export const ListOneClickAppsInputSchema: z.ZodType<ListOneClickAppsInput> = z.strictObject({
  query: z.string().min(1).max(MAX_TEXT_LENGTH).optional().describe(
    "Keep only one-click apps whose name or description contains this text, ignoring case. Default: keep all.",
  ),
  limit: LimitFieldSchema,
});

export const CreateAppInputSchema: z.ZodType<CreateAppInput> = z.strictObject({
  app_name: z.string().min(1).max(MAX_NEW_APP_NAME_LENGTH).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).describe(
    "The new app name: lowercase letters, digits and single dashes, for example `my-api`.",
  ),
  has_persistent_data: z.boolean().optional().describe(
    "True if the app keeps data in a volume that must stay on one server. Default: false.",
  ),
  dry_run: DryRunFieldSchema,
});

export const DeployImageInputSchema: z.ZodType<DeployImageInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  image_name: z.string().min(1).max(MAX_IMAGE_NAME_LENGTH).regex(/^[A-Za-z0-9][A-Za-z0-9._/:@-]*$/).describe(
    "A Docker image the CapRover server can pull, with a tag, for example `nginx:1.27`.",
  ),
  dry_run: DryRunFieldSchema,
});

const EnvVarsFieldSchema = z.string().min(1).max(MAX_ENV_VARS_LENGTH).optional().describe(
  "Variables to set, one `KEY=value` per line. Other variables of the app stay as they are. Default: set none.",
);

const RemoveKeysFieldSchema = z.array(z.string().min(1).max(MAX_ENV_KEY_LENGTH)).max(MAX_REMOVE_KEYS).optional()
  .describe(
    `Names of variables to delete, for example \`["OLD_KEY"]\`. At most ${MAX_REMOVE_KEYS}. Default: delete none.`,
  );

export const SetEnvVarsInputSchema: z.ZodType<SetEnvVarsInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  env_vars: EnvVarsFieldSchema,
  remove_keys: RemoveKeysFieldSchema,
  dry_run: DryRunFieldSchema,
}).refine((input) => input.env_vars !== undefined || input.remove_keys !== undefined, {
  message: "Provide `env_vars`, `remove_keys` or both.",
});

export const BulkEnvUpdateInputSchema: z.ZodType<BulkEnvUpdateInput> = z.strictObject({
  app_names: z.array(AppNameFieldSchema).min(1).max(MAX_BULK_APPS).describe(
    `The apps to change, in the order to change them, from 1 to ${MAX_BULK_APPS} names as returned by \`list_apps\`.`,
  ),
  env_vars: EnvVarsFieldSchema,
  remove_keys: RemoveKeysFieldSchema,
  dry_run: DryRunFieldSchema,
}).refine((input) => input.env_vars !== undefined || input.remove_keys !== undefined, {
  message: "Provide `env_vars`, `remove_keys` or both.",
}).refine((input) => new Set(input.app_names).size === input.app_names.length, {
  message: "List each app once in `app_names`.",
});

export const ScaleAppInputSchema: z.ZodType<ScaleAppInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  instance_count: z.number().int().min(0).max(MAX_INSTANCE_COUNT).describe(
    `The number of running copies of the app, from 0 to ${MAX_INSTANCE_COUNT}. 0 stops the app.`,
  ),
  dry_run: DryRunFieldSchema,
});

export const AddCustomDomainInputSchema: z.ZodType<AddCustomDomainInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  domain: DomainFieldSchema.describe("The domain to attach, in lower case, for example `api.example.com`."),
  dry_run: DryRunFieldSchema,
});

export const EnableSslInputSchema: z.ZodType<EnableSslInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  domain: DomainFieldSchema.optional().describe(
    "A custom domain already attached to the app. Default: enable SSL for the default app domain.",
  ),
  dry_run: DryRunFieldSchema,
});

export const DeleteAppInputSchema: z.ZodType<DeleteAppInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  delete_volumes: z.boolean().optional().describe(
    "If true, also delete the named volumes of the app, which destroys its data. Default: false.",
  ),
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});

export const ListAppsRuntimeInputSchema: z.ZodType<ListInput<ListAppsRuntimeField>> = buildListInputSchema(
  ["appName", "status", "desiredInstances", "runningInstances", "collectionError"],
  "apps",
);

export const RenameAppInputSchema: z.ZodType<RenameAppInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  new_app_name: z.string().min(1).max(MAX_NEW_APP_NAME_LENGTH).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).describe(
    "The new app name: lowercase letters, digits and single dashes, for example `my-api-v2`.",
  ),
  dry_run: DryRunFieldSchema,
});

export const StartBuildInputSchema: z.ZodType<StartBuildInput> = z.strictObject({
  webhook_path: z.string().max(MAX_WEBHOOK_PATH_LENGTH).regex(/^\/user\/apps\/webhooks\/triggerbuild\?[\w=&.-]+$/).describe(
    "The build webhook path of the app, from its Deployment tab in CapRover, starting with `/user/apps/webhooks/triggerbuild?`. It holds a secret token and is never returned.",
  ),
  dry_run: DryRunFieldSchema,
});

export const DeployArchiveInputSchema: z.ZodType<DeployArchiveInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  source_archive: z.string().min(1).max(MAX_ARCHIVE_BASE64_LENGTH).regex(/^[A-Za-z0-9+/]+={0,2}$/).describe(
    `A tar archive of the source, in base64, with a \`captain-definition\` file at its root. At most ${MAX_ARCHIVE_BASE64_LENGTH} characters.`,
  ),
  dry_run: DryRunFieldSchema,
});

export const FindIssuesInputSchema: z.ZodType<FindIssuesInput> = z.strictObject({
  name_contains: z.string().min(1).max(MAX_TEXT_LENGTH).optional().describe(
    "Check only apps whose name contains this text, ignoring case, and skip the server-level checks. Default: check all apps and the server.",
  ),
  limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional().describe(
    `How many findings to return, from 1 to ${MAX_LIST_LIMIT}, the most severe first. Default: 50.`,
  ),
});

export const RedeployAppInputSchema: z.ZodType<RedeployAppInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  dry_run: DryRunFieldSchema,
});
