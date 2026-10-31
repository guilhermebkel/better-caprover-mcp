import { z } from "zod";
import type {
  EnableRootSslInput,
  RemoveCustomDomainInput,
  SetForceSslInput,
  UpdateRootDomainInput,
} from "@/Protocols/DomainInputProtocol.ts";
import { AppNameFieldSchema, DomainFieldSchema } from "@/Schemas/AppInputSchema.ts";
import {
  ConfirmationTokenFieldSchema,
  DryRunFieldSchema,
  UserConfirmedFieldSchema,
} from "@/Schemas/ControlSchema.ts";

const MAX_EMAIL_LENGTH = 254;

export const RemoveCustomDomainInputSchema: z.ZodType<RemoveCustomDomainInput> = z.strictObject({
  app_name: AppNameFieldSchema,
  domain: DomainFieldSchema.describe("A custom domain attached to the app, in lower case, for example `api.example.com`."),
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});

export const UpdateRootDomainInputSchema: z.ZodType<UpdateRootDomainInput> = z.strictObject({
  root_domain: DomainFieldSchema.describe(
    "The new root domain, in lower case, for example `apps.example.com`. Apps are served as `<app>.<root_domain>`.",
  ),
  skip_dns_check: z.boolean().optional().describe(
    "If true, CapRover does not check that `*.<root_domain>` points to the server. Default: false.",
  ),
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});

export const EnableRootSslInputSchema: z.ZodType<EnableRootSslInput> = z.strictObject({
  email_address: z.email().max(MAX_EMAIL_LENGTH).describe(
    "The email address that Let's Encrypt registers the certificate to, for example `ops@example.com`.",
  ),
  dry_run: DryRunFieldSchema,
});

export const SetForceSslInputSchema: z.ZodType<SetForceSslInput> = z.strictObject({
  is_enabled: z.boolean().describe("True redirects all HTTP traffic of the root domain to HTTPS; false allows plain HTTP."),
  dry_run: DryRunFieldSchema,
});
