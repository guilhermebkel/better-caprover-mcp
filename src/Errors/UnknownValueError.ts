import { ToolFailureError } from "@/Errors/ToolFailureError.ts";

export class UnknownValueError extends ToolFailureError {
  constructor(kind: string, value: string, validValues: readonly string[]) {
    const valid = validValues.length === 0 ? "There are none yet." : `Valid values: ${validValues.join(", ")}.`;
    super(`There is no ${kind} "${value}". ${valid}`);
    this.name = "UnknownValueError";
  }
}
