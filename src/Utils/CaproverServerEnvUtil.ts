import type { Env, ResolvedCaproverServer } from "@/Protocols/EnvProtocol.ts";
import type { CaproverServerEntryConfig } from "@/Protocols/ServerRoutingProtocol.ts";
import { DEFAULT_SERVER_NAME } from "@/Schemas/ServerConfigSchema.ts";

export class CaproverServerEnvUtil {
  static buildLegacyServers(
    mode: Env["CAPROVER_MCP_MODE"],
    isCriticalAllowed: boolean,
    url?: string,
    password?: string,
  ): ResolvedCaproverServer[] {
    return [{
      name: DEFAULT_SERVER_NAME,
      url,
      password,
      mode,
      isCriticalAllowed,
    }];
  }

  static buildMultiServers(
    entries: CaproverServerEntryConfig[],
    passwordReader: (entry: CaproverServerEntryConfig) => string,
  ): ResolvedCaproverServer[] {
    return entries.map((entry) => ({
      name: entry.name,
      url: entry.url,
      password: passwordReader(entry),
      mode: entry.mode,
      isCriticalAllowed: entry.isCriticalAllowed ?? false,
    }));
  }
}
