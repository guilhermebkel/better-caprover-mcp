import { ToolFailureError } from "@/Errors/ToolFailureError.ts";

export class MissingPreviewError extends ToolFailureError {
  constructor(toolName: string) {
    super(`${toolName} cannot run as a dry run or ask for confirmation: the operation has no preview.`);
    this.name = "MissingPreviewError";
  }
}
