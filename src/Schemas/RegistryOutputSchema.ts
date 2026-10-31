import {
  buildChangeOutputSchema,
  buildListOutputSchema,
  FlagOutputSchema,
  TextOutputSchema,
} from "@/Schemas/OutputSchema.ts";

export const ListRegistriesOutputSchema = buildListOutputSchema("registries");

export const AddRegistryOutputSchema = buildChangeOutputSchema({ registryDomain: TextOutputSchema });

export const UpdateRegistryOutputSchema = buildChangeOutputSchema({ registryId: TextOutputSchema });

export const DeleteRegistryOutputSchema = buildChangeOutputSchema({ registryId: TextOutputSchema });

export const SetDefaultPushRegistryOutputSchema = buildChangeOutputSchema({
  registryId: TextOutputSchema,
  previousRegistryId: TextOutputSchema,
});

export const SwitchSelfHostedRegistryOutputSchema = buildChangeOutputSchema({ isSelfHosted: FlagOutputSchema });
