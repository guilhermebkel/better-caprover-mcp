import { ToolFailureError } from "@/Errors/ToolFailureError.ts";

export class CaproverRequestError extends ToolFailureError {
  constructor(
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "CaproverRequestError";
  }
}
