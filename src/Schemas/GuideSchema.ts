import { z } from "zod";
import type { GuideTopic } from "@/Protocols/GuideProtocol.ts";

const MAX_TOPIC_LENGTH = 40;

export const GUIDE_TOPICS: readonly GuideTopic[] = ["modes", "code-mode", "app-definition", "env-vars", "deploy", "errors"];

export type GetGuideInput = { topic: string };

export const GetGuideInputSchema: z.ZodType<GetGuideInput> = z.strictObject({
  topic: z.string().trim().min(1).max(MAX_TOPIC_LENGTH).describe(
    `The topic to read, one of: ${GUIDE_TOPICS.join(", ")}. An unknown topic returns the valid names.`,
  ),
});
