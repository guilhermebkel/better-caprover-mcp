import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { DeleteThemeInput } from "@/Protocols/AccountInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ToolFailureError } from "@/Errors/ToolFailureError.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { DeleteThemeInputSchema } from "@/Schemas/AccountInputSchema.ts";
import { DeleteThemeOutputSchema } from "@/Schemas/AccountOutputSchema.ts";

export class DeleteThemeOperation implements OperationPort<DeleteThemeInput> {
  static readonly NAME = "deleteTheme";

  readonly description = "Deletes one custom dashboard theme and its CSS. A built-in theme cannot be deleted. "
    + "Run it only when the person asked to delete this theme, never to tidy up. "
    + "To find the names, use `list_themes`. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = DeleteThemeInputSchema;

  readonly outputSchema = DeleteThemeOutputSchema;

  readonly risk: RiskTier = "destructive";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: DeleteThemeInput): Promise<OperationResult> {
    await this.checkDeletable(input.theme_name);
    const current = await this.client.getCurrentTheme();
    const warning = current === input.theme_name ? " It is the theme in use now." : "";
    return {
      summary: `Would delete the theme ${input.theme_name} and its CSS.${warning}`,
      data: { themeName: input.theme_name, isInUse: current === input.theme_name },
    };
  }

  async execute(input: DeleteThemeInput): Promise<OperationResult> {
    await this.checkDeletable(input.theme_name);
    await this.client.deleteTheme(input.theme_name);
    return { summary: `Deleted the theme ${input.theme_name}.`, data: { themeName: input.theme_name } };
  }

  private async checkDeletable(themeName: string): Promise<void> {
    const themes = await this.client.listThemes();
    const found = themes.find((theme) => theme.themeName === themeName);
    if (found === undefined) {
      throw new UnknownValueError("theme", themeName, themes.map((theme) => theme.themeName));
    }
    if (found.isBuiltIn) {
      throw new ToolFailureError(`The theme ${themeName} is built in and cannot be deleted.`);
    }
  }
}
