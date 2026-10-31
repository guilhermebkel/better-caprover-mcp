import { z } from "zod";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import type {
  AddOneClickRepoInput,
  DeleteOneClickRepoInput,
  DeployOneClickInput,
  JobIdInput,
  ListOneClickReposField,
  TemplateNameInput,
} from "@/Protocols/OneClickInputProtocol.ts";
import {
  ConfirmationTokenFieldSchema,
  DryRunFieldSchema,
  UserConfirmedFieldSchema,
} from "@/Schemas/ControlSchema.ts";
import { buildListInputSchema } from "@/Schemas/ListSchema.ts";

const MAX_TEMPLATE_NAME_LENGTH = 100;
const MAX_URL_LENGTH = 500;
const MAX_VARIABLES = 50;
const MAX_VARIABLE_ID_LENGTH = 100;
const MAX_VARIABLE_VALUE_LENGTH = 2000;
const MAX_JOB_ID_LENGTH = 200;

const RepositoryUrlFieldSchema = z.url({ protocol: /^https?$/ }).max(MAX_URL_LENGTH).describe(
  "The URL of a one-click app repository, for example `https://example.com/apps`.",
);

export const GetOneClickAppInputSchema: z.ZodType<TemplateNameInput> = z.strictObject({
  template_name: z.string().min(1).max(MAX_TEMPLATE_NAME_LENGTH).describe(
    "A one-click app name as returned by `list_one_click_apps`, for example `postgres`.",
  ),
});

export const ListOneClickReposInputSchema: z.ZodType<ListInput<ListOneClickReposField>> = buildListInputSchema(
  ["repositoryUrl"],
  "repositories",
);

export const AddOneClickRepoInputSchema: z.ZodType<AddOneClickRepoInput> = z.strictObject({
  repository_url: RepositoryUrlFieldSchema,
  dry_run: DryRunFieldSchema,
});

export const DeleteOneClickRepoInputSchema: z.ZodType<DeleteOneClickRepoInput> = z.strictObject({
  repository_url: RepositoryUrlFieldSchema,
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});

export const DeployOneClickInputSchema: z.ZodType<DeployOneClickInput> = z.strictObject({
  template_name: z.string().min(1).max(MAX_TEMPLATE_NAME_LENGTH).describe(
    "A one-click app name as returned by `list_one_click_apps`, for example `postgres`.",
  ),
  variables: z.array(z.strictObject({
    variable_id: z.string().min(1).max(MAX_VARIABLE_ID_LENGTH).describe(
      "A variable id as returned by `get_one_click_app`, for example `$$cap_appname`.",
    ),
    variable_value: z.string().max(MAX_VARIABLE_VALUE_LENGTH).describe("The value for this variable."),
  })).max(MAX_VARIABLES).optional().describe(
    `Values for the template variables. At most ${MAX_VARIABLES}. Default: the defaults of the template; a variable with no default must be set.`,
  ),
  dry_run: DryRunFieldSchema,
});

export const GetOneClickDeployProgressInputSchema: z.ZodType<JobIdInput> = z.strictObject({
  job_id: z.string().min(1).max(MAX_JOB_ID_LENGTH).describe("The `jobId` that `deploy_one_click` returned."),
});
