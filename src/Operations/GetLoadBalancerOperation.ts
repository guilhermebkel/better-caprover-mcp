import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetLoadBalancerInputSchema } from "@/Schemas/ClusterInputSchema.ts";
import { GetLoadBalancerOutputSchema } from "@/Schemas/ClusterOutputSchema.ts";

export class GetLoadBalancerOperation implements OperationPort<Record<string, never>> {
  static readonly NAME = "getLoadBalancer";

  readonly description = "Read-only. Reads the connection counters of the nginx load balancer in front of the apps: active, accepted, "
    + "handled, reading, writing and waiting connections, and the total requests since it started. "
    + "Use it to see the traffic of the whole server; for the servers themselves, use `list_nodes`. It returns one object.";

  readonly inputSchema = GetLoadBalancerInputSchema;

  readonly outputSchema = GetLoadBalancerOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(): Promise<OperationResult> {
    const info = await this.client.getLoadBalancer();
    return {
      summary: `${info.activeConnections} active connections; ${info.totalRequests} requests since the load balancer started.`,
      data: { ...info },
    };
  }
}
