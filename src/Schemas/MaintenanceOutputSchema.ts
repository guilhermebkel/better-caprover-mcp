import {
  buildChangeOutputSchema,
  buildListOutputSchema,
  buildReadOutputSchema,
  CountOutputSchema,
  FlagOutputSchema,
  RowListOutputSchema,
  TextListOutputSchema,
  TextOutputSchema,
} from "@/Schemas/OutputSchema.ts";

export const GetDiskUsageOutputSchema = buildReadOutputSchema({ nodes: RowListOutputSchema });

export const ListUnusedImagesOutputSchema = buildListOutputSchema("images");

export const DeleteImagesOutputSchema = buildChangeOutputSchema({
  applied: TextListOutputSchema,
  notApplied: TextListOutputSchema,
});

export const GetDiskCleanupOutputSchema = buildReadOutputSchema({
  keepRecentCount: CountOutputSchema,
  cronSchedule: TextOutputSchema,
  timezone: TextOutputSchema,
});

export const SetDiskCleanupOutputSchema = buildChangeOutputSchema({
  keepRecentCount: CountOutputSchema,
  cronSchedule: TextOutputSchema,
  timezone: TextOutputSchema,
});

export const UpdateCaproverOutputSchema = buildChangeOutputSchema({
  currentVersion: TextOutputSchema,
  targetVersion: TextOutputSchema,
});

export const GetNginxConfigOutputSchema = buildReadOutputSchema({
  baseHasCustomValue: FlagOutputSchema,
  baseCustomValue: TextOutputSchema,
  captainHasCustomValue: FlagOutputSchema,
  captainCustomValue: TextOutputSchema,
  isTruncated: FlagOutputSchema,
});

export const SetNginxConfigOutputSchema = buildChangeOutputSchema({
  isBaseChanged: FlagOutputSchema,
  isCaptainChanged: FlagOutputSchema,
});
