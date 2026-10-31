import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { DeleteRegistryInput } from "@/Protocols/RegistryInputProtocol.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { DeleteRegistryInputSchema } from "@/Schemas/RegistryInputSchema.ts";
import { DeleteRegistryOutputSchema } from "@/Schemas/RegistryOutputSchema.ts";

export class DeleteRegistryOperation implements OperationPort<DeleteRegistryInput> {
  static readonly NAME = "deleteRegistry";

  readonly description = "Deletes one Docker registry and its saved login. Apps that pull images from it can no longer deploy. "
    + "Run it only when the person asked to delete this registry, never to tidy up. "
    + "To find the id, use `list_registries`. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = DeleteRegistryInputSchema;

  readonly outputSchema = DeleteRegistryOutputSchema;

  readonly risk: RiskTier = "destructive";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: DeleteRegistryInput): Promise<OperationResult> {
    const { domain, isDefaultPush } = await this.readRegistry(input.registry_id);
    const warning = isDefaultPush ? " It is the registry that receives pushed images now." : "";
    return {
      summary: `Would delete the registry ${domain} (${input.registry_id}) and its login.${warning}`,
      data: { registryId: input.registry_id, registryDomain: domain, isDefaultPush },
    };
  }

  async execute(input: DeleteRegistryInput): Promise<OperationResult> {
    const { domain } = await this.readRegistry(input.registry_id);
    await this.client.deleteRegistry(input.registry_id);
    return { summary: `Deleted the registry ${domain}.`, data: { registryId: input.registry_id } };
  }

  private async readRegistry(registryId: string): Promise<{
    domain: string; isDefaultPush: boolean;
  }> {
    const { registries, defaultPushRegistryId } = await this.client.listRegistries();
    const found = registries.find((registry) => registry.registryId === registryId);
    if (found === undefined) {
      throw new UnknownValueError("registry", registryId, registries.map((registry) => registry.registryId));
    }
    return { domain: found.registryDomain, isDefaultPush: found.registryId === defaultPushRegistryId };
  }
}
