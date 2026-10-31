import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { DeleteProjectsInput } from "@/Protocols/ProjectInputProtocol.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { DeleteProjectsInputSchema } from "@/Schemas/ProjectInputSchema.ts";
import { DeleteProjectsOutputSchema } from "@/Schemas/ProjectOutputSchema.ts";
import { BatchUtil } from "@/Utils/BatchUtil.ts";

export class DeleteProjectsOperation implements OperationPort<DeleteProjectsInput> {
  static readonly NAME = "deleteProjects";

  readonly description = "Deletes projects one by one, in the order given, and stops at the first failure. "
    + "Run it only when the person asked to delete these projects, never to tidy up. "
    + "CapRover refuses a project that still holds apps. It returns `applied` and `notApplied`; there is no transaction. "
    + "Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = DeleteProjectsInputSchema;

  readonly outputSchema = DeleteProjectsOutputSchema;

  readonly risk: RiskTier = "destructive";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: DeleteProjectsInput): Promise<OperationResult> {
    const names = await this.readNames(input);
    return {
      summary: `Would delete ${names.length} projects: ${names.join(", ")}. This cannot be undone.`,
      data: { projectIds: input.project_ids, projectNames: names },
    };
  }

  async execute(input: DeleteProjectsInput): Promise<OperationResult> {
    await this.readNames(input);
    const outcome = await BatchUtil.run(input.project_ids, (projectId) => this.client.deleteProjects([projectId]));
    return BatchUtil.buildResult({ pastVerb: "Deleted", noun: "projects", outcome });
  }

  private async readNames(input: DeleteProjectsInput): Promise<string[]> {
    const projects = await this.client.listProjects();
    const ids = projects.map((project) => project.projectId);
    const unknown = input.project_ids.find((projectId) => !ids.includes(projectId));
    if (unknown !== undefined) {
      throw new UnknownValueError("project", unknown, ids);
    }
    return projects.filter((project) => input.project_ids.includes(project.projectId)).map((project) => project.name);
  }
}
