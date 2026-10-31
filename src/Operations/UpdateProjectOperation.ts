import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort, CaproverProject } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { UpdateProjectInput } from "@/Protocols/ProjectInputProtocol.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { UpdateProjectInputSchema } from "@/Schemas/ProjectInputSchema.ts";
import { UpdateProjectOutputSchema } from "@/Schemas/ProjectOutputSchema.ts";

export class UpdateProjectOperation implements OperationPort<UpdateProjectInput> {
  static readonly NAME = "updateProject";

  readonly description = "Changes the name, the description or the parent of one project and keeps the fields you leave out. "
    + "Use it to rename or move a project; to find its id, use `list_projects`. "
    + "It returns the project id and its name after the change. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = UpdateProjectInputSchema;

  readonly outputSchema = UpdateProjectOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: UpdateProjectInput): Promise<OperationResult> {
    const { current, next } = await this.buildChange(input);
    return {
      summary: `Would change the project ${current.name} (${current.projectId}) to the name ${next.name}.`,
      data: { projectId: current.projectId, projectName: next.name, previousProjectName: current.name },
    };
  }

  async execute(input: UpdateProjectInput): Promise<OperationResult> {
    const { next } = await this.buildChange(input);
    await this.client.updateProject(next);
    return {
      summary: `Changed the project ${next.projectId}; its name is ${next.name}.`,
      data: { projectId: next.projectId, projectName: next.name },
    };
  }

  private async buildChange(input: UpdateProjectInput): Promise<{
    current: CaproverProject; next: CaproverProject;
  }> {
    const projects = await this.client.listProjects();
    const current = projects.find((project) => project.projectId === input.project_id);
    if (current === undefined) {
      throw new UnknownValueError("project", input.project_id, projects.map((project) => project.projectId));
    }
    const hasParentInput = input.parent_project_id !== undefined;
    const parentProjectId = hasParentInput ? input.parent_project_id ?? undefined : current.parentProjectId;
    return {
      current,
      next: {
        projectId: current.projectId,
        name: input.project_name ?? current.name,
        description: input.project_description ?? current.description,
        parentProjectId,
      },
    };
  }
}
