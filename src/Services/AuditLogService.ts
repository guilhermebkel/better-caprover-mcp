import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";

export type AuditResult = "ok" | "denied" | "error";

export type AuditRecord = {
  tool: string;
  server: string;
  risk: RiskTier;
  result: AuditResult;
  atMs: number;
};

export class AuditLogService {
  write(record: AuditRecord): void {
    LogUtil.logAudit(record);
  }
}
