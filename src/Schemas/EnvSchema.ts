import { z } from "zod";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { AccessModeSchema } from "@/Schemas/AccessSchema.ts";

export const EnvSchema: z.ZodType<Env> = z.object({
  CAPROVER_MCP_MODE: AccessModeSchema.default("readonly"),
});
