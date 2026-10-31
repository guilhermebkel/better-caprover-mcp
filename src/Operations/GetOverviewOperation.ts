import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { GetOverviewInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetOverviewInputSchema } from "@/Schemas/AppInputSchema.ts";
import type { PolicyServicePort } from "@/Protocols/AccessProtocol.ts";
import { GetOverviewOutputSchema } from "@/Schemas/AppOutputSchema.ts";

export class GetOverviewOperation implements OperationPort<GetOverviewInput> {
  static readonly NAME = "getOverview";

  readonly description = "Read-only. Reads a summary of the CapRover server: root domain, version, SSL state, app count, "
    + "and the access mode of this MCP server with the risk tiers it allows. Use it to learn what this server may do. "
    + "To see the apps, use `list_apps`. It always returns one summary object.";

  readonly inputSchema = GetOverviewInputSchema;

  readonly outputSchema = GetOverviewOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly policy: PolicyServicePort,
  ) {}

  async execute(): Promise<OperationResult> {
    const info = await this.client.getSystemInfo();
    const { apps } = await this.client.listApps();
    const accessMode = this.policy.getMode();
    const domain = info.rootDomain === "" ? "no root domain yet" : info.rootDomain;
    return {
      summary: `CapRover ${info.currentVersion} with ${domain} runs ${apps.length} apps. Access mode: ${accessMode}.`,
      data: {
        rootDomain: info.rootDomain,
        hasRootSsl: info.hasRootSsl,
        isSslForced: info.isSslForced,
        caproverVersion: info.currentVersion,
        latestVersion: info.latestVersion,
        canUpdate: info.canUpdate,
        appCount: apps.length,
        enabledRiskTiers: this.policy.getEnabledTiers(),
        accessMode,
      },
    };
  }
}
