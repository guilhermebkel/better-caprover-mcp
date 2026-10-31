import type { ControlFields } from "@/Protocols/ControlProtocol.ts";

export type TemplateNameInput = { template_name: string };

export type ListOneClickReposField = "repositoryUrl";

export type RepositoryUrlInput = { repository_url: string };

export type AddOneClickRepoInput = Pick<ControlFields, "dry_run"> & RepositoryUrlInput;

export type DeleteOneClickRepoInput = ControlFields & RepositoryUrlInput;

export type OneClickVariableInput = {
  variable_id: string; variable_value: string;
};

export type DeployOneClickInput = Pick<ControlFields, "dry_run"> & TemplateNameInput & { variables?: OneClickVariableInput[] };

export type JobIdInput = { job_id: string };
