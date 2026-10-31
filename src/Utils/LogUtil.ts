import type { AuditRecord } from "@/Protocols/AuditProtocol.ts";

export class LogUtil {
  static logInfo(event: string): void {
    LogUtil.write("info", event, undefined);
  }

  static logError(event: string, detail: string): void {
    LogUtil.write("error", event, detail);
  }

  static logAudit(record: AuditRecord): void {
    const payload = {
      level: "audit",
      time: new Date(record.atMs).toISOString(),
      tool: record.tool,
      risk: record.risk,
      result: record.result,
    };
    process.stderr.write(`${JSON.stringify(payload)}\n`);
  }

  static showMessage(text: string): void {
    // Why: stdout belongs to the MCP protocol, so text for a person also goes to stderr.
    process.stderr.write(`${text}\n`);
  }

  private static write(level: "info" | "error", event: string, detail: string | undefined): void {
    // Why: stdout belongs to the MCP protocol, so every log line goes to stderr.
    process.stderr.write(`${JSON.stringify({ level, event, detail })}\n`);
  }
}
