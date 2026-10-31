import { z } from "zod";
import type {
  CreateProjectInput,
  DeleteProjectsInput,
  ListProjectsField,
  UpdateProjectInput,
} from "@/Protocols/ProjectInputProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import {
  ConfirmationTokenFieldSchema,
  DryRunFieldSchema,
  UserConfirmedFieldSchema,
} from "@/Schemas/ControlSchema.ts";
import { buildListInputSchema } from "@/Schemas/ListSchema.ts";

const MAX_PROJECT_NAME_LENGTH = 100;
const MAX_PROJECT_DESCRIPTION_LENGTH = 500;
const MAX_PROJECT_ID_LENGTH = 100;
const MAX_PROJECT_IDS = 20;

const ProjectIdFieldSchema = z.string().min(1).max(MAX_PROJECT_ID_LENGTH).describe(
  "A project id as returned by `list_projects`.",
);

const ProjectNameFieldSchema = z.string().trim().min(1).max(MAX_PROJECT_NAME_LENGTH);

export const ListProjectsInputSchema: z.ZodType<ListInput<ListProjectsField>> = buildListInputSchema(
  ["projectId", "name", "description", "parentProjectId"],
  "projects",
);

export const CreateProjectInputSchema: z.ZodType<CreateProjectInput> = z.strictObject({
  project_name: ProjectNameFieldSchema.describe("The name of the new project, for example `shop`."),
  project_description: z.string().max(MAX_PROJECT_DESCRIPTION_LENGTH).optional().describe(
    "A short description of the project. Default: empty.",
  ),
  parent_project_id: ProjectIdFieldSchema.optional().describe(
    "The id of the project that holds this one, as returned by `list_projects`. Default: a top-level project.",
  ),
  dry_run: DryRunFieldSchema,
});

export const UpdateProjectInputSchema: z.ZodType<UpdateProjectInput> = z.strictObject({
  project_id: ProjectIdFieldSchema,
  project_name: ProjectNameFieldSchema.optional().describe("The new name. Omit to keep the current name."),
  project_description: z.string().max(MAX_PROJECT_DESCRIPTION_LENGTH).optional().describe(
    "The new description. Omit to keep the current one.",
  ),
  parent_project_id: ProjectIdFieldSchema.nullable().optional().describe(
    "The id of the new parent project; null moves the project to the top level; omit to keep the parent.",
  ),
  dry_run: DryRunFieldSchema,
}).refine(
  (input) => Object.values({ ...input, project_id: undefined }).some((field) => field !== undefined),
  { message: "Provide `project_name`, `project_description`, `parent_project_id` or more than one." },
);

export const DeleteProjectsInputSchema: z.ZodType<DeleteProjectsInput> = z.strictObject({
  project_ids: z.array(ProjectIdFieldSchema).min(1).max(MAX_PROJECT_IDS).describe(
    `Ids of the projects to delete, from \`list_projects\`. At most ${MAX_PROJECT_IDS}.`,
  ),
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});
