import { z } from "zod";
import type { AccessMode, SurfaceName, Toolset } from "@/Protocols/AccessProtocol.ts";

export const AccessModeSchema: z.ZodType<AccessMode> = z.enum(["readonly", "operate", "admin"]);

export const TOOLSETS: readonly Toolset[] = [
  "core", "apps", "domains", "projects", "oneclick", "registries", "cluster", "maintenance", "monitoring", "account",
];

export const DEFAULT_TOOLSETS: readonly Toolset[] = ["core", "apps", "domains", "oneclick"];

export const ToolsetSchema: z.ZodType<Toolset> = z.enum(TOOLSETS);

export const SURFACES: readonly SurfaceName[] = ["tools", "code", "both"];

// Why: the benchmark of issue 5 (S9) decides whether this changes; until it runs, `tools` keeps what the first release did.
export const DEFAULT_SURFACE: SurfaceName = "tools";
