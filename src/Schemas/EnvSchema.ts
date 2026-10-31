import { z } from "zod";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { AccessModeSchema } from "@/Schemas/AccessSchema.ts";

const OptionalTextSchema = z.string().optional().transform((text) => (text === undefined || text === "" ? undefined : text));

export const EnvSchema: z.ZodType<Env> = z.object({
  CAPROVER_MCP_MODE: AccessModeSchema.default("readonly"),
  CAPROVER_MCP_ALLOW_CRITICAL: z.string().optional().transform((text) => text === "1"),
  CAPROVER_URL: OptionalTextSchema.pipe(
    z.url({ protocol: /^https?$/, error: "CAPROVER_URL must be a URL that starts with http:// or https://" })
      .transform((url) => new URL(url).origin)
      .optional(),
  ),
  CAPROVER_PASSWORD: OptionalTextSchema,
});
