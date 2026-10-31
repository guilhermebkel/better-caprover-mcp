import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetTwoFactorStatusInputSchema } from "@/Schemas/AccountInputSchema.ts";
import { GetTwoFactorStatusOutputSchema } from "@/Schemas/AccountOutputSchema.ts";

export class GetTwoFactorStatusOperation implements OperationPort<Record<string, never>> {
  static readonly NAME = "getTwoFactorStatus";

  readonly description = "Read-only. Reads whether two-factor login is on for the CapRover dashboard. "
    + "Use it when a login fails with a two-factor error; this server cannot log in while it is on, and it cannot change it. "
    + "To read the access of this server, use `get_access`. It always returns one object.";

  readonly inputSchema = GetTwoFactorStatusInputSchema;

  readonly outputSchema = GetTwoFactorStatusOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(): Promise<OperationResult> {
    const isTwoFactorEnabled = await this.client.getTwoFactorStatus();
    return { summary: `Two-factor login is ${isTwoFactorEnabled ? "on" : "off"}.`, data: { isTwoFactorEnabled } };
  }
}
