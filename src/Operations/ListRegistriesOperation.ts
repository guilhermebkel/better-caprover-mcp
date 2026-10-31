import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { ListRegistriesField } from "@/Protocols/RegistryInputProtocol.ts";
import { ListRegistriesInputSchema } from "@/Schemas/RegistryInputSchema.ts";
import { ListRegistriesOutputSchema } from "@/Schemas/RegistryOutputSchema.ts";
import { ListUtil } from "@/Utils/ListUtil.ts";

export class ListRegistriesOperation implements OperationPort<ListInput<ListRegistriesField>> {
  static readonly NAME = "listRegistries";

  readonly description = "Read-only. Lists the Docker registries CapRover knows: id, user, host, image prefix and type, "
    + "and which one receives pushed images. Use it to find a registry id for `update_registry`, `delete_registry` "
    + "or `set_default_push_registry`. It never returns a password. It returns `registries`, `total` and `isTruncated`; "
    + "raise `limit` or set `filter` when `isTruncated` is true.";

  readonly inputSchema = ListRegistriesInputSchema;

  readonly outputSchema = ListRegistriesOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: ListInput<ListRegistriesField>): Promise<OperationResult> {
    const { registries, defaultPushRegistryId } = await this.client.listRegistries();
    const rows = registries.map((registry) => ({
      registryId: registry.registryId,
      registryUser: registry.registryUser,
      registryDomain: registry.registryDomain,
      registryImagePrefix: registry.registryImagePrefix,
      registryType: registry.registryType,
      isDefaultPush: registry.registryId === defaultPushRegistryId,
    }));
    return ListUtil.buildResult({ noun: "registries", rows, input });
  }
}
