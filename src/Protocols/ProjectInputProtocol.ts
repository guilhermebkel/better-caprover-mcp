import type { ControlFields } from "@/Protocols/ControlProtocol.ts";

export type ListProjectsField = "projectId" | "name" | "description" | "parentProjectId";

export type CreateProjectInput = Pick<ControlFields, "dry_run"> & {
  project_name: string;
  project_description?: string;
  parent_project_id?: string;
};

export type UpdateProjectInput = Pick<ControlFields, "dry_run"> & {
  project_id: string;
  project_name?: string;
  project_description?: string;
  parent_project_id?: string | null;
};

export type DeleteProjectsInput = ControlFields & { project_ids: string[] };
