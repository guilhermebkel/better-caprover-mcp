export class LogUtil {
  static logInfo(event: string): void {
    LogUtil.write("info", event, undefined);
  }

  static logError(event: string, detail: string): void {
    LogUtil.write("error", event, detail);
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
