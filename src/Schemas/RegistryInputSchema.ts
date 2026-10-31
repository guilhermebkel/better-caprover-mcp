import { z } from "zod";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import type {
  AddRegistryInput,
  DeleteRegistryInput,
  ListRegistriesField,
  SetDefaultPushRegistryInput,
  SwitchSelfHostedRegistryInput,
  UpdateRegistryInput,
} from "@/Protocols/RegistryInputProtocol.ts";
import {
  ConfirmationTokenFieldSchema,
  DryRunFieldSchema,
  UserConfirmedFieldSchema,
} from "@/Schemas/ControlSchema.ts";
import { buildListInputSchema } from "@/Schemas/ListSchema.ts";

const MAX_REGISTRY_ID_LENGTH = 100;
const MAX_REGISTRY_USER_LENGTH = 200;
const MAX_REGISTRY_PASSWORD_LENGTH = 500;
const MAX_REGISTRY_DOMAIN_LENGTH = 253;
const MAX_IMAGE_PREFIX_LENGTH = 200;

const RegistryIdFieldSchema = z.string().min(1).max(MAX_REGISTRY_ID_LENGTH).describe(
  "A registry id as returned by `list_registries`.",
);

const REGISTRY_DETAILS_SHAPE = {
  registry_user: z.string().min(1).max(MAX_REGISTRY_USER_LENGTH).describe("The user name to log in to the registry with."),
  registry_password: z.string().min(1).max(MAX_REGISTRY_PASSWORD_LENGTH).describe(
    "The password or access token of the registry. It is sent to CapRover and never returned.",
  ),
  registry_domain: z.string().trim().toLowerCase().min(1).max(MAX_REGISTRY_DOMAIN_LENGTH).regex(
    /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/,
  ).describe("The registry host, with a port if it is not the default, for example `registry.example.com` or `docker.io`."),
  registry_image_prefix: z.string().max(MAX_IMAGE_PREFIX_LENGTH).optional().describe(
    "The prefix CapRover puts before image names, usually the account or organization, for example `team`. Default: none.",
  ),
};

export const ListRegistriesInputSchema: z.ZodType<ListInput<ListRegistriesField>> = buildListInputSchema(
  ["registryId", "registryUser", "registryDomain", "registryImagePrefix", "registryType", "isDefaultPush"],
  "registries",
);

export const AddRegistryInputSchema: z.ZodType<AddRegistryInput> = z.strictObject({
  ...REGISTRY_DETAILS_SHAPE,
  dry_run: DryRunFieldSchema,
});

export const UpdateRegistryInputSchema: z.ZodType<UpdateRegistryInput> = z.strictObject({
  registry_id: RegistryIdFieldSchema,
  ...REGISTRY_DETAILS_SHAPE,
  dry_run: DryRunFieldSchema,
});

export const DeleteRegistryInputSchema: z.ZodType<DeleteRegistryInput> = z.strictObject({
  registry_id: RegistryIdFieldSchema,
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});

export const SetDefaultPushRegistryInputSchema: z.ZodType<SetDefaultPushRegistryInput> = z.strictObject({
  registry_id: RegistryIdFieldSchema,
  dry_run: DryRunFieldSchema,
});

export const SwitchSelfHostedRegistryInputSchema: z.ZodType<SwitchSelfHostedRegistryInput> = z.strictObject({
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});
