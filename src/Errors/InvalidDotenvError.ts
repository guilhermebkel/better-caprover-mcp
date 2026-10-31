import { ToolFailureError } from "@/Errors/ToolFailureError.ts";

export class InvalidDotenvError extends ToolFailureError {
  constructor(lineNumber: number, reason: string, lineStart: string) {
    super(`Invalid env_vars at line ${lineNumber}: ${reason} The line starts with "${lineStart}". Write one KEY=value per line.`);
    this.name = "InvalidDotenvError";
  }
}
