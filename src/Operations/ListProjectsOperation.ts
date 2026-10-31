import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { ListProjectsField } from "@/Protocols/ProjectInputProtocol.ts";
import { ListProjectsInputSchema } from "@/Schemas/ProjectInputSchema.ts";
import { ListProjectsOutputSchema } from "@/Schemas/ProjectOutputSchema.ts";
import { ListUtil } from "@/Utils/ListUtil.ts";

export class ListProjectsOperation implements OperationPort<ListInput<ListProjectsField>> {
  static readonly NAME = "listProjects";

  readonly description = "Read-only. Lists the projects that group apps on the CapRover server, with their id, name, description "
    + "and parent. Use it to find a project id for `update_project` or `delete_projects`. "
    + "It returns `projects` (empty when there are none), `total` and `isTruncated`; "
    + "raise `limit` or set `filter` when `isTruncated` is true.";

  readonly inputSchema = ListProjectsInputSchema;

  readonly outputSchema = ListProjectsOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: ListInput<ListProjectsField>): Promise<OperationResult> {
    const rows = await this.client.listProjects();
    return ListUtil.buildResult({ noun: "projects", rows, input });
  }
}
