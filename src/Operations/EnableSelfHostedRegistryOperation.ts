import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { SwitchSelfHostedRegistryInput } from "@/Protocols/RegistryInputProtocol.ts";
import { SwitchSelfHostedRegistryInputSchema } from "@/Schemas/RegistryInputSchema.ts";
import { SwitchSelfHostedRegistryOutputSchema } from "@/Schemas/RegistryOutputSchema.ts";

export class EnableSelfHostedRegistryOperation implements OperationPort<SwitchSelfHostedRegistryInput> {
  static readonly NAME = "enableSelfHostedRegistry";

  readonly description = "Starts the registry that CapRover hosts on its own server and makes it the default for pushed images. "
    + "Run it only when the person asked for it; it changes how every app image is stored. "
    + "It is critical: it needs admin mode and CAPROVER_MCP_ALLOW_CRITICAL=1. "
    + "To undo it, use `disable_self_hosted_registry`. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = SwitchSelfHostedRegistryInputSchema;

  readonly outputSchema = SwitchSelfHostedRegistryOutputSchema;

  readonly risk: RiskTier = "critical";

  constructor(private readonly client: CaproverClientPort) {}

  describeChange(): Promise<OperationResult> {
    return Promise.resolve({
      summary: "Would start the registry hosted by CapRover and make it the default for pushed images. "
        + "Every later build is stored there, on the disk of this server.",
      data: { isSelfHosted: true },
    });
  }

  async execute(): Promise<OperationResult> {
    await this.client.enableSelfHostedRegistry();
    return { summary: "Started the registry hosted by CapRover.", data: { isSelfHosted: true } };
  }
}
