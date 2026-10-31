import {
  buildChangeOutputSchema,
  buildListOutputSchema,
  buildReadOutputSchema,
  CountOutputSchema,
  FlagOutputSchema,
  TextListOutputSchema,
  TextOutputSchema,
} from "@/Schemas/OutputSchema.ts";

export const GetNetDataOutputSchema = buildReadOutputSchema({
  isEnabled: FlagOutputSchema,
  netDataUrl: TextOutputSchema,
  configuredChannels: TextListOutputSchema,
});

export const SetNetDataOutputSchema = buildChangeOutputSchema({
  isEnabled: FlagOutputSchema,
  previousIsEnabled: FlagOutputSchema,
});

export const GetGoAccessOutputSchema = buildReadOutputSchema({
  isEnabled: FlagOutputSchema,
  rotationFrequencyCron: TextOutputSchema,
});

export const SetGoAccessOutputSchema = buildChangeOutputSchema({
  isEnabled: FlagOutputSchema,
  rotationFrequencyCron: TextOutputSchema,
  logRetentionDays: CountOutputSchema,
});

export const ListGoAccessReportsOutputSchema = buildListOutputSchema("reports");
