import type { AccessMode } from "@/Protocols/AccessProtocol.ts";
import type { LogLevel } from "@/Protocols/LogProtocol.ts";

export type Env = {
  CAPROVER_MCP_MODE: AccessMode;
  CAPROVER_MCP_ALLOW_CRITICAL: boolean;
  CAPROVER_MCP_TRANSPORT: "stdio" | "http";
  CAPROVER_MCP_LOG_LEVEL: LogLevel;
  CAPROVER_URL?: string;
  CAPROVER_PASSWORD?: string;
  CAPROVER_MCP_HTTP_HOST: string;
  CAPROVER_MCP_HTTP_PORT: number;
  CAPROVER_MCP_HTTP_TOKEN?: string;
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: number;
  CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: number;
  CAPROVER_MCP_MAX_HTTP_SESSIONS: number;
  CAPROVER_MCP_HTTP_SESSION_TTL_MS: number;
  CAPROVER_MCP_MAX_CONCURRENT: number;
};
