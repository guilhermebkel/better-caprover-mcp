import { ToolFailureError } from "@/Errors/ToolFailureError.ts";

export class AppNotFoundError extends ToolFailureError {
  constructor(appName: string, closestNames: readonly string[]) {
    const hint = closestNames.length > 0
      ? `Closest app names: ${closestNames.join(", ")}.`
      : "The server has no app with a similar name.";
    super(`App "${appName}" does not exist. ${hint} Use an app name as returned by \`list_apps\`.`);
    this.name = "AppNotFoundError";
  }
}
