import {
  buildChangeOutputSchema,
  buildListOutputSchema,
  TextListOutputSchema,
  TextOutputSchema,
} from "@/Schemas/OutputSchema.ts";

export const ListProjectsOutputSchema = buildListOutputSchema("projects");

export const CreateProjectOutputSchema = buildChangeOutputSchema({
  projectId: TextOutputSchema,
  projectName: TextOutputSchema,
});

export const UpdateProjectOutputSchema = buildChangeOutputSchema({
  projectId: TextOutputSchema,
  projectName: TextOutputSchema,
});

export const DeleteProjectsOutputSchema = buildChangeOutputSchema({
  applied: TextListOutputSchema,
  notApplied: TextListOutputSchema,
});
