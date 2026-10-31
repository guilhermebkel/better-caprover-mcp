import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { EnableRootSslInput } from "@/Protocols/DomainInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { EnableRootSslInputSchema } from "@/Schemas/DomainInputSchema.ts";
import { EnableRootSslOutputSchema } from "@/Schemas/DomainOutputSchema.ts";

export class EnableRootSslOperation implements OperationPort<EnableRootSslInput> {
  static readonly NAME = "enableRootSsl";

  readonly description = "Turns on HTTPS for the root domain of the CapRover server with a Let's Encrypt certificate. "
    + "Use it once, after the root domain points to the server; for the HTTPS of one app, use `enable_ssl`. "
    + "Let's Encrypt fails when the DNS record is wrong. It returns the root domain. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = EnableRootSslInputSchema;

  readonly outputSchema = EnableRootSslOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(): Promise<OperationResult> {
    const info = await this.client.getSystemInfo();
    const state = info.hasRootSsl ? "HTTPS is on already." : "HTTPS is off now.";
    return {
      summary: `Would request a certificate for *.${info.rootDomain}. ${state}`,
      data: { rootDomain: info.rootDomain, hasRootSsl: info.hasRootSsl },
    };
  }

  async execute(input: EnableRootSslInput): Promise<OperationResult> {
    const info = await this.client.getSystemInfo();
    await this.client.enableRootSsl(input.email_address);
    return {
      summary: `Turned on HTTPS for ${info.rootDomain}. CapRover may restart its web server.`,
      data: { rootDomain: info.rootDomain, hasRootSsl: true },
    };
  }
}
