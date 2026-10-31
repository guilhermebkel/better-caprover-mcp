import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { SetProApiKeyInput } from "@/Protocols/AccountInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { SetProApiKeyInputSchema } from "@/Schemas/AccountInputSchema.ts";
import { SetProApiKeyOutputSchema } from "@/Schemas/AccountOutputSchema.ts";

export class SetProApiKeyOperation implements OperationPort<SetProApiKeyInput> {
  static readonly NAME = "setProApiKey";

  readonly description = "Saves the CapRover Pro API key, which unlocks the Pro features of the dashboard. "
    + "Use it only when the person gave the key; to see the result, use `get_pro_state`. "
    + "The key is sent to CapRover and never returned. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = SetProApiKeyInputSchema;

  readonly outputSchema = SetProApiKeyOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(): Promise<OperationResult> {
    const state = await this.client.getProState();
    return {
      summary: `Would save a Pro API key. The subscription is ${state.isSubscribed ? "active" : "not active"} now.`,
      data: { isKeySet: false, isSubscribed: state.isSubscribed },
    };
  }

  async execute(input: SetProApiKeyInput): Promise<OperationResult> {
    await this.client.setProApiKey(input.api_key);
    return { summary: "Saved the Pro API key. Read `get_pro_state` to check the subscription.", data: { isKeySet: true } };
  }
}
