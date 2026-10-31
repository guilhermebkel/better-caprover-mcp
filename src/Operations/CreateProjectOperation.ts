import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { CreateProjectInput } from "@/Protocols/ProjectInputProtocol.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { CreateProjectInputSchema } from "@/Schemas/ProjectInputSchema.ts";
import { CreateProjectOutputSchema } from "@/Schemas/ProjectOutputSchema.ts";

export class CreateProjectOperation implements OperationPort<CreateProjectInput> {
  static readonly NAME = "createProject";

  readonly description = "Creates a project, a named group for apps, optionally inside another project. "
    + "Use it to organize apps; to remove projects, use `delete_projects`. "
    + "It returns the id of the new project. It writes to the server; with `dry_run` it only checks the parent.";

  readonly inputSchema = CreateProjectInputSchema;

  readonly outputSchema = CreateProjectOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: CreateProjectInput): Promise<OperationResult> {
    await this.checkParent(input);
    return {
      summary: `Would create the project ${input.project_name}${CreateProjectOperation.describeParent(input)}.`,
      data: { projectName: input.project_name, parentProjectId: input.parent_project_id },
    };
  }

  async execute(input: CreateProjectInput): Promise<OperationResult> {
    await this.checkParent(input);
    const project = await this.client.createProject({
      name: input.project_name,
      description: input.project_description ?? "",
      parentProjectId: input.parent_project_id,
    });
    return {
      summary: `Created the project ${project.name} with id ${project.projectId}.`,
      data: { projectId: project.projectId, projectName: project.name },
    };
  }

  private static describeParent(input: CreateProjectInput): string {
    return input.parent_project_id === undefined ? "" : " inside " + input.parent_project_id;
  }

  private async checkParent(input: CreateProjectInput): Promise<void> {
    if (input.parent_project_id === undefined) {
      return;
    }
    const projects = await this.client.listProjects();
    const ids = projects.map((project) => project.projectId);
    if (!ids.includes(input.parent_project_id)) {
      throw new UnknownValueError("project", input.parent_project_id, ids);
    }
  }
}
