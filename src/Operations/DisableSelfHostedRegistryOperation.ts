import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { SwitchSelfHostedRegistryInput } from "@/Protocols/RegistryInputProtocol.ts";
import { SwitchSelfHostedRegistryInputSchema } from "@/Schemas/RegistryInputSchema.ts";
import { SwitchSelfHostedRegistryOutputSchema } from "@/Schemas/RegistryOutputSchema.ts";

export class DisableSelfHostedRegistryOperation implements OperationPort<SwitchSelfHostedRegistryInput> {
  static readonly NAME = "disableSelfHostedRegistry";

  readonly description = "Stops the registry that CapRover hosts on its own server. Images stored only there become unavailable, "
    + "and apps that need them fail to start on other nodes. "
    + "It is critical: it needs admin mode and CAPROVER_MCP_ALLOW_CRITICAL=1. "
    + "Run it only when the person asked for it. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = SwitchSelfHostedRegistryInputSchema;

  readonly outputSchema = SwitchSelfHostedRegistryOutputSchema;

  readonly risk: RiskTier = "critical";

  constructor(private readonly client: CaproverClientPort) {}

  describeChange(): Promise<OperationResult> {
    return Promise.resolve({
      summary: "Would stop the registry hosted by CapRover. Images stored only there become unavailable.",
      data: { isSelfHosted: false },
    });
  }

  async execute(): Promise<OperationResult> {
    await this.client.disableSelfHostedRegistry();
    return { summary: "Stopped the registry hosted by CapRover.", data: { isSelfHosted: false } };
  }
}
