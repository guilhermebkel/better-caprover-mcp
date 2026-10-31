import type { AccessMode } from "@/Protocols/AccessProtocol.ts";

export type ResolvedCaproverServer = {
  name: string;
  url?: string;
  password?: string;
  mode: AccessMode;
  isCriticalAllowed: boolean;
};

export type ClientNameToHttpToken = Record<string, string>;

export type Env = {
  CAPROVER_MCP_MODE: AccessMode;
  CAPROVER_MCP_ALLOW_CRITICAL: boolean;
  CAPROVER_URL?: string;
  CAPROVER_PASSWORD?: string;
  CAPROVER_MCP_HTTP_HOST: string;
  CAPROVER_MCP_HTTP_PORT: number;
  CAPROVER_MCP_HTTP_TOKENS?: ClientNameToHttpToken;
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: number;
  CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: number;
  CAPROVER_MCP_MAX_HTTP_SESSIONS: number;
  CAPROVER_MCP_HTTP_SESSION_TTL_MS: number;
  CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER: number;
  servers: ResolvedCaproverServer[];
};
