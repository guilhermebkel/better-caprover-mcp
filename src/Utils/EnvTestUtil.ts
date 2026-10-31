import type { AccessMode } from "@/Protocols/AccessProtocol.ts";
import type { Env, ResolvedCaproverServer } from "@/Protocols/EnvProtocol.ts";
import { DEFAULT_SERVER_NAME } from "@/Schemas/ServerConfigSchema.ts";

const DEFAULT_HTTP_HOST = "127.0.0.1";
const DEFAULT_HTTP_PORT = 3100;
const DEFAULT_MAX_HTTP_BODY_BYTES = 1_048_576;
const DEFAULT_MAX_CONCURRENT_PER_SERVER = 5;

export class EnvTestUtil {
  static build(
    overrides: Partial<Env> & {
      mode?: AccessMode;
      url?: string;
      password?: string;
      servers?: ResolvedCaproverServer[];
    } = {},
  ): Env {
    const mode = overrides.mode ?? overrides.CAPROVER_MCP_MODE ?? "readonly";
    const url = overrides.url ?? overrides.CAPROVER_URL;
    const password = overrides.password ?? overrides.CAPROVER_PASSWORD;
    const isCriticalAllowed = overrides.CAPROVER_MCP_ALLOW_CRITICAL ?? false;
    const servers = overrides.servers ?? [{
      name: DEFAULT_SERVER_NAME,
      url,
      password,
      mode,
      isCriticalAllowed,
    }];
    return {
      CAPROVER_MCP_MODE: mode,
      CAPROVER_MCP_ALLOW_CRITICAL: isCriticalAllowed,
      CAPROVER_URL: url,
      CAPROVER_PASSWORD: password,
      CAPROVER_MCP_HTTP_HOST: overrides.CAPROVER_MCP_HTTP_HOST ?? DEFAULT_HTTP_HOST,
      CAPROVER_MCP_HTTP_PORT: overrides.CAPROVER_MCP_HTTP_PORT ?? DEFAULT_HTTP_PORT,
      CAPROVER_MCP_HTTP_TOKENS: overrides.CAPROVER_MCP_HTTP_TOKENS,
      CAPROVER_MCP_MAX_HTTP_BODY_BYTES: overrides.CAPROVER_MCP_MAX_HTTP_BODY_BYTES ?? DEFAULT_MAX_HTTP_BODY_BYTES,
      CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER:
        overrides.CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER ?? DEFAULT_MAX_CONCURRENT_PER_SERVER,
      servers,
    };
  }
}
