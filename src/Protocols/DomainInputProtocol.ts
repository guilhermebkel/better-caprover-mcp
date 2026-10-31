import type { AppNameInput } from "@/Protocols/AppInputProtocol.ts";
import type { ControlFields } from "@/Protocols/ControlProtocol.ts";

export type RemoveCustomDomainInput = AppNameInput & ControlFields & { domain: string };

export type UpdateRootDomainInput = ControlFields & {
  root_domain: string; skip_dns_check?: boolean;
};

export type EnableRootSslInput = Pick<ControlFields, "dry_run"> & { email_address: string };

export type SetForceSslInput = Pick<ControlFields, "dry_run"> & { is_enabled: boolean };
