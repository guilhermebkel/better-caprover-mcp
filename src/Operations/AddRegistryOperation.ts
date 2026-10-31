import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { AddRegistryInput } from "@/Protocols/RegistryInputProtocol.ts";
import { AddRegistryInputSchema } from "@/Schemas/RegistryInputSchema.ts";
import { AddRegistryOutputSchema } from "@/Schemas/RegistryOutputSchema.ts";

export class AddRegistryOperation implements OperationPort<AddRegistryInput> {
  static readonly NAME = "addRegistry";

  readonly description = "Adds a remote Docker registry that CapRover can pull from and push to, with its login. "
    + "Use it before deploying images from a private registry; to make it receive pushed images, use `set_default_push_registry`. "
    + "The password is sent to CapRover and never returned. It returns the registry host. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = AddRegistryInputSchema;

  readonly outputSchema = AddRegistryOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: AddRegistryInput): Promise<OperationResult> {
    const { registries } = await this.client.listRegistries();
    const isListed = registries.some((registry) => registry.registryDomain === input.registry_domain
      && registry.registryUser === input.registry_user);
    return {
      summary: `Would add the registry ${input.registry_domain} for the user ${input.registry_user}. `
        + (isListed ? "A registry with this host and user exists already." : "It is new."),
      data: { registryDomain: input.registry_domain, isAlreadyListed: isListed },
    };
  }

  async execute(input: AddRegistryInput): Promise<OperationResult> {
    await this.client.addRegistry({
      registryId: "",
      registryUser: input.registry_user,
      registryPassword: input.registry_password,
      registryDomain: input.registry_domain,
      registryImagePrefix: input.registry_image_prefix ?? "",
    });
    return { summary: `Added the registry ${input.registry_domain}.`, data: { registryDomain: input.registry_domain } };
  }
}
