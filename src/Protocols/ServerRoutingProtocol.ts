import type { AccessMode } from "@/Protocols/AccessProtocol.ts";

export type ServerSummary = {
  name: string;
  accessMode: AccessMode;
  enabledRiskTiers: readonly string[];
};

export type CaproverServerEntryConfig = {
  name: string;
  url: string;
  mode: AccessMode;
  isCriticalAllowed?: boolean;
  passwordEnv?: string;
  passwordFile?: string;
};
