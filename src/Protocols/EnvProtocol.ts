import type { AccessMode } from "@/Protocols/AccessProtocol.ts";

export type Env = {
  CAPROVER_MCP_MODE: AccessMode;
  CAPROVER_MCP_ALLOW_CRITICAL: boolean;
  CAPROVER_URL?: string;
  CAPROVER_PASSWORD?: string;
};
