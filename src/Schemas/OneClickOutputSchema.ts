import {
  buildChangeOutputSchema,
  buildListOutputSchema,
  buildReadOutputSchema,
  CountOutputSchema,
  FlagOutputSchema,
  RowListOutputSchema,
  TextListOutputSchema,
  TextOutputSchema,
} from "@/Schemas/OutputSchema.ts";

export const GetOneClickAppOutputSchema = buildReadOutputSchema({
  templateName: TextOutputSchema,
  displayName: TextOutputSchema,
  variables: RowListOutputSchema,
});

export const ListOneClickReposOutputSchema = buildListOutputSchema("repositories");

export const AddOneClickRepoOutputSchema = buildChangeOutputSchema({ repositoryUrl: TextOutputSchema });

export const DeleteOneClickRepoOutputSchema = buildChangeOutputSchema({ repositoryUrl: TextOutputSchema });

export const DeployOneClickOutputSchema = buildChangeOutputSchema({
  templateName: TextOutputSchema,
  jobId: TextOutputSchema,
  missingVariableIds: TextListOutputSchema,
});

export const GetOneClickDeployProgressOutputSchema = buildReadOutputSchema({
  jobId: TextOutputSchema,
  steps: TextListOutputSchema,
  currentStep: CountOutputSchema,
  isFinished: FlagOutputSchema,
  hasFailed: FlagOutputSchema,
});
