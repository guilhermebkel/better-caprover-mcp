import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { SetForceSslInput } from "@/Protocols/DomainInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { SetForceSslInputSchema } from "@/Schemas/DomainInputSchema.ts";
import { SetForceSslOutputSchema } from "@/Schemas/DomainOutputSchema.ts";

export class SetForceSslOperation implements OperationPort<SetForceSslInput> {
  static readonly NAME = "setForceSsl";

  readonly description = "Turns the redirect of all HTTP traffic to HTTPS on or off for the whole server. "
    + "Use it after `enable_root_ssl`; with HTTPS off at the root, forcing it makes the dashboard unreachable. "
    + "It returns the new and the previous setting. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = SetForceSslInputSchema;

  readonly outputSchema = SetForceSslOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: SetForceSslInput): Promise<OperationResult> {
    const info = await this.client.getSystemInfo();
    const warning = input.is_enabled && !info.hasRootSsl ? " HTTPS is off at the root, so the dashboard would become unreachable." : "";
    return {
      summary: `Would set the HTTPS redirect to ${input.is_enabled}; it is ${info.isSslForced} now.${warning}`,
      data: { isEnabled: input.is_enabled, previousIsEnabled: info.isSslForced, hasRootSsl: info.hasRootSsl },
    };
  }

  async execute(input: SetForceSslInput): Promise<OperationResult> {
    const info = await this.client.getSystemInfo();
    await this.client.setForceSsl(input.is_enabled);
    return {
      summary: `Set the HTTPS redirect to ${input.is_enabled}; it was ${info.isSslForced}.`,
      data: { isEnabled: input.is_enabled, previousIsEnabled: info.isSslForced },
    };
  }
}
