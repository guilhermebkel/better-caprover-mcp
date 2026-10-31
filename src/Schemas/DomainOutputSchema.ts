import {
  buildChangeOutputSchema,
  FlagOutputSchema,
  TextOutputSchema,
} from "@/Schemas/OutputSchema.ts";

export const RemoveCustomDomainOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
  domain: TextOutputSchema,
});

export const UpdateRootDomainOutputSchema = buildChangeOutputSchema({
  rootDomain: TextOutputSchema,
  previousRootDomain: TextOutputSchema,
});

export const EnableRootSslOutputSchema = buildChangeOutputSchema({
  rootDomain: TextOutputSchema,
  hasRootSsl: FlagOutputSchema,
});

export const SetForceSslOutputSchema = buildChangeOutputSchema({
  isEnabled: FlagOutputSchema,
  previousIsEnabled: FlagOutputSchema,
});
