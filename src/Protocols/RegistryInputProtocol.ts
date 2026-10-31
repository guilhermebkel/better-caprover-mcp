import type { ControlFields } from "@/Protocols/ControlProtocol.ts";

export type ListRegistriesField = "registryId" | "registryUser" | "registryDomain" | "registryImagePrefix" | "registryType" | "isDefaultPush";

export type RegistryIdInput = { registry_id: string };

export type RegistryDetailsInput = {
  registry_user: string;
  registry_password: string;
  registry_domain: string;
  registry_image_prefix?: string;
};

export type AddRegistryInput = Pick<ControlFields, "dry_run"> & RegistryDetailsInput;

export type UpdateRegistryInput = Pick<ControlFields, "dry_run"> & RegistryIdInput & RegistryDetailsInput;

export type DeleteRegistryInput = ControlFields & RegistryIdInput;

export type SetDefaultPushRegistryInput = Pick<ControlFields, "dry_run"> & RegistryIdInput;

export type SwitchSelfHostedRegistryInput = ControlFields;
