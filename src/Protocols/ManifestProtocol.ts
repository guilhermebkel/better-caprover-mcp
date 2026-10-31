import type { SurfaceName, Toolset } from "@/Protocols/AccessProtocol.ts";

export type ManifestOptions = {
  toolsets: readonly Toolset[];
  isElicitationAvailable: () => boolean;
  surface?: SurfaceName;
};
