import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ListNodesField } from "@/Protocols/ClusterInputProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ListNodesInputSchema } from "@/Schemas/ClusterInputSchema.ts";
import { ListNodesOutputSchema } from "@/Schemas/ClusterOutputSchema.ts";
import { ListUtil } from "@/Utils/ListUtil.ts";

export class ListNodesOperation implements OperationPort<ListInput<ListNodesField>> {
  static readonly NAME = "listNodes";

  readonly description = "Read-only. Lists the servers in the CapRover cluster: role, leader, host name, address, memory, "
    + "Docker version, state and availability. Use it to see how many servers run apps; for the load of the web server, "
    + "use `get_load_balancer`. It returns `nodes`, `total` and `isTruncated`; raise `limit` or set `filter` when `isTruncated` is true.";

  readonly inputSchema = ListNodesInputSchema;

  readonly outputSchema = ListNodesOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: ListInput<ListNodesField>): Promise<OperationResult> {
    const rows = await this.client.listNodes();
    return ListUtil.buildResult({ noun: "nodes", rows, input });
  }
}
