import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { SetDefaultPushRegistryInput } from "@/Protocols/RegistryInputProtocol.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { SetDefaultPushRegistryInputSchema } from "@/Schemas/RegistryInputSchema.ts";
import { SetDefaultPushRegistryOutputSchema } from "@/Schemas/RegistryOutputSchema.ts";

export class SetDefaultPushRegistryOperation implements OperationPort<SetDefaultPushRegistryInput> {
  static readonly NAME = "setDefaultPushRegistry";

  readonly description = "Chooses the registry that receives the images CapRover builds. Use it after `add_registry`; "
    + "to find the registry id, use `list_registries`. Builds fail when the login of that registry is wrong. "
    + "It returns the new and the previous registry id. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = SetDefaultPushRegistryInputSchema;

  readonly outputSchema = SetDefaultPushRegistryOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: SetDefaultPushRegistryInput): Promise<OperationResult> {
    const previous = await this.checkListed(input.registry_id);
    return {
      summary: `Would send built images to ${input.registry_id}; it is ${previous ?? "none"} now.`,
      data: { registryId: input.registry_id, previousRegistryId: previous },
    };
  }

  async execute(input: SetDefaultPushRegistryInput): Promise<OperationResult> {
    const previous = await this.checkListed(input.registry_id);
    await this.client.setDefaultPushRegistry(input.registry_id);
    return {
      summary: `Built images go to ${input.registry_id} now; it was ${previous ?? "none"}.`,
      data: { registryId: input.registry_id, previousRegistryId: previous },
    };
  }

  private async checkListed(registryId: string): Promise<string | undefined> {
    const { registries, defaultPushRegistryId } = await this.client.listRegistries();
    const ids = registries.map((registry) => registry.registryId);
    if (!ids.includes(registryId)) {
      throw new UnknownValueError("registry", registryId, ids);
    }
    return defaultPushRegistryId;
  }
}
