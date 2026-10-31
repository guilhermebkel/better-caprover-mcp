import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverApp, CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { RemoveCustomDomainInput } from "@/Protocols/DomainInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { RemoveCustomDomainOutputSchema } from "@/Schemas/DomainOutputSchema.ts";
import { RemoveCustomDomainInputSchema } from "@/Schemas/DomainInputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";

export class RemoveCustomDomainOperation implements OperationPort<RemoveCustomDomainInput> {
  static readonly NAME = "removeCustomDomain";

  readonly description = "Detaches one custom domain from an app, so the app stops answering on it and its certificate for that domain goes. "
    + "Run it only when the person asked to remove this domain, never to tidy up. "
    + "To attach one, use `add_custom_domain`. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = RemoveCustomDomainInputSchema;

  readonly outputSchema = RemoveCustomDomainOutputSchema;

  readonly risk: RiskTier = "destructive";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: RemoveCustomDomainInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const hasSsl = RemoveCustomDomainOperation.findDomain(app, input.domain).hasSsl;
    return {
      summary: `Would remove ${input.domain} from ${app.appName}. It ${hasSsl ? "has" : "has no"} HTTPS now. Traffic to it stops.`,
      data: { appName: app.appName, domain: input.domain, hasSsl },
    };
  }

  async execute(input: RemoveCustomDomainInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    RemoveCustomDomainOperation.findDomain(app, input.domain);
    await this.client.removeCustomDomain(app.appName, input.domain);
    return { summary: `Removed ${input.domain} from ${app.appName}.`, data: { appName: app.appName, domain: input.domain } };
  }

  private static findDomain(app: CaproverApp, domain: string): CaproverApp["customDomains"][number] {
    const found = app.customDomains.find((customDomain) => customDomain.publicDomain === domain);
    if (found === undefined) {
      throw new UnknownValueError(
        `custom domain on ${app.appName}`,
        domain,
        app.customDomains.map((customDomain) => customDomain.publicDomain),
      );
    }
    return found;
  }
}
