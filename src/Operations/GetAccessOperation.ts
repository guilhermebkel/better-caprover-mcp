import type { RiskTier, Toolset } from "@/Protocols/AccessProtocol.ts";
import type { GetAccessInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetAccessInputSchema } from "@/Schemas/AppInputSchema.ts";
import { GetAccessOutputSchema } from "@/Schemas/AppOutputSchema.ts";
import type { PolicyServicePort } from "@/Protocols/AccessProtocol.ts";

export class GetAccessOperation implements OperationPort<GetAccessInput> {
  static readonly NAME = "getAccess";

  static readonly SURFACE = "tools";

  readonly description = "Read-only. Reports what this MCP server may do: the access mode, the risk tiers it allows, whether "
    + "critical operations are unlocked, the surface, the enabled toolsets, whether the client can ask the person directly, "
    + "the CapRover version and the Pro state. Use it when a call is denied or an operation is missing. "
    + "To read the state of the CapRover server, use `get_overview`. It always returns one object.";

  readonly inputSchema = GetAccessInputSchema;

  readonly outputSchema = GetAccessOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly policy: PolicyServicePort,
    private readonly toolsets: readonly Toolset[],
    private readonly isElicitationAvailable: () => boolean,
  ) {}

  async execute(): Promise<OperationResult> {
    const info = await this.client.getSystemInfo();
    const proState = await this.readProState();
    const accessMode = this.policy.getMode();
    return {
      summary: `Access mode ${accessMode}; critical operations ${this.policy.isCriticalUnlocked() ? "unlocked" : "locked"}; `
        + `toolsets: ${this.toolsets.join(", ")}.`,
      data: {
        accessMode,
        enabledRiskTiers: this.policy.getEnabledTiers(),
        isCriticalUnlocked: this.policy.isCriticalUnlocked(),
        surface: GetAccessOperation.SURFACE,
        toolsets: [...this.toolsets],
        isElicitationAvailable: this.isElicitationAvailable(),
        caproverVersion: info.currentVersion,
        ...proState,
      },
    };
  }

  private async readProState(): Promise<Record<string, unknown>> {
    try {
      const state = await this.client.getProState();
      return { isProFeatureFlagEnabled: state.isFeatureFlagEnabled, isProSubscribed: state.isSubscribed };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      return { proStateError: `The Pro state could not be read: ${reason}` };
    }
  }
}
