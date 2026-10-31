import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { UpdateRegistryInput } from "@/Protocols/RegistryInputProtocol.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { UpdateRegistryInputSchema } from "@/Schemas/RegistryInputSchema.ts";
import { UpdateRegistryOutputSchema } from "@/Schemas/RegistryOutputSchema.ts";

export class UpdateRegistryOperation implements OperationPort<UpdateRegistryInput> {
  static readonly NAME = "updateRegistry";

  readonly description = "Replaces the login and the address of one Docker registry. Use it when the password or the host changed; "
    + "to find the registry id, use `list_registries`. You must give the password again. "
    + "The password is sent to CapRover and never returned. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = UpdateRegistryInputSchema;

  readonly outputSchema = UpdateRegistryOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: UpdateRegistryInput): Promise<OperationResult> {
    await this.checkListed(input.registry_id);
    return {
      summary: `Would update the registry ${input.registry_id} to the host ${input.registry_domain} and the user ${input.registry_user}.`,
      data: { registryId: input.registry_id },
    };
  }

  async execute(input: UpdateRegistryInput): Promise<OperationResult> {
    await this.checkListed(input.registry_id);
    await this.client.updateRegistry({
      registryId: input.registry_id,
      registryUser: input.registry_user,
      registryPassword: input.registry_password,
      registryDomain: input.registry_domain,
      registryImagePrefix: input.registry_image_prefix ?? "",
    });
    return { summary: `Updated the registry ${input.registry_id}.`, data: { registryId: input.registry_id } };
  }

  private async checkListed(registryId: string): Promise<void> {
    const { registries } = await this.client.listRegistries();
    const ids = registries.map((registry) => registry.registryId);
    if (!ids.includes(registryId)) {
      throw new UnknownValueError("registry", registryId, ids);
    }
  }
}
