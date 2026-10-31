import { ToolFailureError } from "@/Errors/ToolFailureError.ts";

export class CaproverConfigError extends ToolFailureError {
  constructor() {
    super(
      "CAPROVER_URL and CAPROVER_PASSWORD are not both set. Tell the person to set them in the environment of "
      + "this MCP server (`better-caprover-mcp init` prints an example) and restart the server.",
    );
    this.name = "CaproverConfigError";
  }
}
