import { ToolFailureError } from "@/Errors/ToolFailureError.ts";

export class OperationDeniedError extends ToolFailureError {
  constructor(message: string) {
    super(message);
    this.name = "OperationDeniedError";
  }
}
