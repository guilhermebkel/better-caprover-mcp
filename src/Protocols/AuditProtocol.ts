import type { RiskTier } from "@/Protocols/AccessProtocol.ts";

export type AuditResult = "ok" | "denied" | "error";

export type AuditRecord = {
  tool: string;
  risk: RiskTier;
  result: AuditResult;
  atMs: number;
};
