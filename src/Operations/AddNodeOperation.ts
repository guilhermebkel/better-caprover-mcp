import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { AddNodeInput } from "@/Protocols/ClusterInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { AddNodeInputSchema } from "@/Schemas/ClusterInputSchema.ts";
import { AddNodeOutputSchema } from "@/Schemas/ClusterOutputSchema.ts";

const DEFAULT_SSH_PORT = 22;
const DEFAULT_SSH_USER = "root";

export class AddNodeOperation implements OperationPort<AddNodeInput> {
  static readonly NAME = "addNode";

  readonly description = "Joins another server to the CapRover cluster: CapRover logs in over SSH with the key and installs Docker there. "
    + "Run it only when the person gave this server and asked to add it. "
    + "It is critical: it needs admin mode and CAPROVER_MCP_ALLOW_CRITICAL=1. "
    + "The key is sent to CapRover and never returned. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = AddNodeInputSchema;

  readonly outputSchema = AddNodeOutputSchema;

  readonly risk: RiskTier = "critical";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: AddNodeInput): Promise<OperationResult> {
    const nodes = await this.client.listNodes();
    return {
      summary: `Would add ${input.remote_node_ip_address} as a ${input.node_role} to a cluster of ${nodes.length} nodes. `
        + "CapRover logs in over SSH and installs Docker on it.",
      data: {
        nodeRole: input.node_role,
        remoteNodeIpAddress: input.remote_node_ip_address,
        currentNodeCount: nodes.length,
      },
    };
  }

  async execute(input: AddNodeInput): Promise<OperationResult> {
    await this.client.addNode({
      nodeRole: input.node_role,
      privateKey: input.private_key,
      remoteNodeIpAddress: input.remote_node_ip_address,
      sshPort: String(input.ssh_port ?? DEFAULT_SSH_PORT),
      sshUser: input.ssh_user ?? DEFAULT_SSH_USER,
      captainIpAddress: input.captain_ip_address,
    });
    return {
      summary: `Added ${input.remote_node_ip_address} as a ${input.node_role}. Read \`list_nodes\` to see it.`,
      data: { nodeRole: input.node_role, remoteNodeIpAddress: input.remote_node_ip_address },
    };
  }
}
