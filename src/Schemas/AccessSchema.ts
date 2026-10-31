import { z } from "zod";
import type { AccessMode, Toolset } from "@/Protocols/AccessProtocol.ts";

export const AccessModeSchema: z.ZodType<AccessMode> = z.enum(["readonly", "operate", "admin"]);

export const TOOLSETS: readonly Toolset[] = [
  "core", "apps", "domains", "projects", "oneclick", "registries", "cluster", "maintenance", "monitoring", "account",
];

export const DEFAULT_TOOLSETS: readonly Toolset[] = ["core", "apps", "domains", "oneclick"];

export const ToolsetSchema: z.ZodType<Toolset> = z.enum(TOOLSETS);
