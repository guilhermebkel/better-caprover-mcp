import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { UpdateRootDomainInput } from "@/Protocols/DomainInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { UpdateRootDomainInputSchema } from "@/Schemas/DomainInputSchema.ts";
import { UpdateRootDomainOutputSchema } from "@/Schemas/DomainOutputSchema.ts";

export class UpdateRootDomainOperation implements OperationPort<UpdateRootDomainInput> {
  static readonly NAME = "updateRootDomain";

  readonly description = "Changes the root domain of the CapRover server, so every app URL and the dashboard URL change. "
    + "Run it only when the person asked for this exact domain; a wrong value can lock everyone out of the dashboard. "
    + "It is critical: it needs admin mode and CAPROVER_MCP_ALLOW_CRITICAL=1. "
    + "Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = UpdateRootDomainInputSchema;

  readonly outputSchema = UpdateRootDomainOutputSchema;

  readonly risk: RiskTier = "critical";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: UpdateRootDomainInput): Promise<OperationResult> {
    const info = await this.client.getSystemInfo();
    return {
      summary: `Would change the root domain from ${info.rootDomain === "" ? "none" : info.rootDomain} `
        + `to ${input.root_domain}. Every app URL changes, and the dashboard may move to a new address.`,
      data: {
        rootDomain: input.root_domain,
        previousRootDomain: info.rootDomain,
        skipsDnsCheck: input.skip_dns_check === true,
      },
    };
  }

  async execute(input: UpdateRootDomainInput): Promise<OperationResult> {
    const info = await this.client.getSystemInfo();
    await this.client.updateRootDomain(input.root_domain, input.skip_dns_check === true);
    return {
      summary: `Changed the root domain from ${info.rootDomain} to ${input.root_domain}. Turn on HTTPS again with \`enable_root_ssl\`.`,
      data: { rootDomain: input.root_domain, previousRootDomain: info.rootDomain },
    };
  }
}
