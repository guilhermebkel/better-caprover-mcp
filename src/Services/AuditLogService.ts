import { LogUtil } from "@/Utils/LogUtil.ts";
import type { AuditRecord } from "@/Protocols/AuditLogProtocol.ts";

export class AuditLogService {
  write(record: AuditRecord): void {
    LogUtil.logAudit(record);
  }
}
