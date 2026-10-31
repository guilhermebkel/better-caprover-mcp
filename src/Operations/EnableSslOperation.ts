import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { EnableSslInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { EnableSslInputSchema } from "@/Schemas/AppInputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";

export class EnableSslOperation implements OperationPort<EnableSslInput> {
  static readonly NAME = "enableSsl";

  readonly description = "Turns on HTTPS for the default domain of one app, or for one custom domain of it. "
    + "Use it after the domain points to the server; to attach a custom domain first, use `add_custom_domain`. "
    + "CapRover asks Let's Encrypt for a certificate, which fails when the DNS record is wrong. "
    + "It returns the domain. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = EnableSslInputSchema;

  readonly risk: RiskTier = "write";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: EnableSslInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const target = input.domain ?? "the default domain";
    const isAttached = input.domain === undefined
      || app.customDomains.some((customDomain) => customDomain.publicDomain === input.domain);
    const outcome = isAttached ? "" : " The domain is not attached to the app, so the call would fail.";
    return {
      summary: `Would turn on HTTPS for ${target} of ${app.appName}.${outcome}`,
      data: { appName: app.appName, domain: input.domain, isDomainAttached: isAttached },
    };
  }

  async execute(input: EnableSslInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    await this.client.enableSsl(app.appName, input.domain);
    return {
      summary: `Turned on HTTPS for ${input.domain ?? "the default domain"} of ${app.appName}.`,
      data: { appName: app.appName, domain: input.domain },
    };
  }
}
