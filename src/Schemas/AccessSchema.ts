import { z } from "zod";
import type { AccessMode } from "@/Protocols/AccessProtocol.ts";

export const AccessModeSchema: z.ZodType<AccessMode> = z.enum(["readonly", "operate", "admin"]);
