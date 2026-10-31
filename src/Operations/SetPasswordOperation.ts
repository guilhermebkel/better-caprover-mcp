import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { SetPasswordInput } from "@/Protocols/AccountInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { SetPasswordInputSchema } from "@/Schemas/AccountInputSchema.ts";
import { SetPasswordOutputSchema } from "@/Schemas/AccountOutputSchema.ts";

export class SetPasswordOperation implements OperationPort<SetPasswordInput> {
  static readonly NAME = "setPassword";

  readonly description = "Changes the CapRover password. This server keeps logging in with the old one from CAPROVER_PASSWORD, "
    + "so after the change the person must update that variable and restart the server. "
    + "Run it only when the person gave the new password and asked for the change. "
    + "It is critical: it needs admin mode and CAPROVER_MCP_ALLOW_CRITICAL=1. "
    + "The password is never returned. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = SetPasswordInputSchema;

  readonly outputSchema = SetPasswordOutputSchema;

  readonly risk: RiskTier = "critical";

  constructor(private readonly client: CaproverClientPort) {}

  describeChange(): Promise<OperationResult> {
    return Promise.resolve({
      summary: "Would change the CapRover password. This server then cannot log in until the person sets "
        + "CAPROVER_PASSWORD to the new value and restarts it.",
      data: { mustUpdateServerConfig: true },
    });
  }

  async execute(input: SetPasswordInput): Promise<OperationResult> {
    await this.client.setPassword(input.new_password);
    return {
      summary: "Changed the CapRover password. Tell the person to set CAPROVER_PASSWORD to the new value and restart this server.",
      data: { mustUpdateServerConfig: true },
    };
  }
}
