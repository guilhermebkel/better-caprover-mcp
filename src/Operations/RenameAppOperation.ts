import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { RenameAppInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ToolFailureError } from "@/Errors/ToolFailureError.ts";
import { RenameAppInputSchema } from "@/Schemas/AppInputSchema.ts";
import { RenameAppOutputSchema } from "@/Schemas/AppOutputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";

export class RenameAppOperation implements OperationPort<RenameAppInput> {
  static readonly NAME = "renameApp";

  readonly description = "Renames one app. Use it only to change the app name; to change its domains, use `add_custom_domain`. "
    + "CapRover recreates the app service, so its default URL changes and the app restarts. "
    + "It returns the old and the new name; it fails if the new name is taken. "
    + "It writes to the server; with `dry_run` it only checks the names.";

  readonly inputSchema = RenameAppInputSchema;

  readonly outputSchema = RenameAppOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: RenameAppInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const isTaken = await this.isNameTaken(input.new_app_name);
    const outcome = isTaken ? "The new name is taken, so the call would fail." : "The new name is free.";
    return {
      summary: `Would rename ${app.appName} to ${input.new_app_name}, and its URL changes. ${outcome}`,
      data: { appName: app.appName, newAppName: input.new_app_name, isNewNameTaken: isTaken },
    };
  }

  async execute(input: RenameAppInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    if (await this.isNameTaken(input.new_app_name)) {
      throw new ToolFailureError(`The name ${input.new_app_name} is taken. Pick another name; \`list_apps\` shows the used ones.`);
    }
    await this.client.renameApp(app.appName, input.new_app_name);
    return {
      summary: `Renamed ${app.appName} to ${input.new_app_name}. Its URL changed and the app restarts.`,
      data: { appName: app.appName, newAppName: input.new_app_name },
    };
  }

  private async isNameTaken(appName: string): Promise<boolean> {
    const { apps } = await this.client.listApps();
    return apps.some((app) => app.appName === appName);
  }
}
