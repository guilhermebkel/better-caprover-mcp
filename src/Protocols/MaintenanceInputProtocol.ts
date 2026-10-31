import type { ControlFields } from "@/Protocols/ControlProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";

export type ListUnusedImagesField = "imageId" | "tags";

export type ListUnusedImagesInput = ListInput<ListUnusedImagesField> & { keep_recent_count?: number };

export type DeleteImagesInput = ControlFields & { image_ids: string[] };

export type SetDiskCleanupInput = Pick<ControlFields, "dry_run"> & {
  keep_recent_count: number;
  cron_schedule: string;
  timezone: string;
};

export type UpdateCaproverInput = ControlFields;

export type SetNginxConfigInput = ControlFields & {
  base_config?: string;
  captain_config?: string;
};
