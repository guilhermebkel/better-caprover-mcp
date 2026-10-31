import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { AddCustomDomainInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { AddCustomDomainInputSchema } from "@/Schemas/AppInputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";
import { AddCustomDomainOutputSchema } from "@/Schemas/AppOutputSchema.ts";

export class AddCustomDomainOperation implements OperationPort<AddCustomDomainInput> {
  static readonly NAME = "addCustomDomain";

  readonly description = "Attaches a custom domain to one app. Use it to serve the app on your own domain; "
    + "to turn on HTTPS for that domain afterwards, use `enable_ssl`. The DNS record of the domain must already "
    + "point to the CapRover server, or CapRover refuses it. It returns the domain. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = AddCustomDomainInputSchema;

  readonly outputSchema = AddCustomDomainOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: AddCustomDomainInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const isAttached = app.customDomains.some((customDomain) => customDomain.publicDomain === input.domain);
    return {
      summary: `Would attach ${input.domain} to ${app.appName}. ${isAttached ? "It is attached already." : "It is not attached yet."}`,
      data: { appName: app.appName, domain: input.domain, isAlreadyAttached: isAttached },
    };
  }

  async execute(input: AddCustomDomainInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    await this.client.addCustomDomain(app.appName, input.domain);
    return {
      summary: `Attached ${input.domain} to ${app.appName}. HTTPS is still off for it.`,
      data: { appName: app.appName, domain: input.domain },
    };
  }
}
