import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { SetCurrentThemeInput } from "@/Protocols/AccountInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { SetCurrentThemeInputSchema } from "@/Schemas/AccountInputSchema.ts";
import { SetCurrentThemeOutputSchema } from "@/Schemas/AccountOutputSchema.ts";

export class SetCurrentThemeOperation implements OperationPort<SetCurrentThemeInput> {
  static readonly NAME = "setCurrentTheme";

  readonly description = "Switches the dashboard to another existing theme. Use it to change the look of the dashboard; "
    + "to find the names, use `list_themes`; to make a new theme, use `save_theme`. "
    + "It returns the new and the previous theme. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = SetCurrentThemeInputSchema;

  readonly outputSchema = SetCurrentThemeOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: SetCurrentThemeInput): Promise<OperationResult> {
    const previous = await this.checkListed(input.theme_name);
    return {
      summary: `Would switch the dashboard from ${previous} to ${input.theme_name}.`,
      data: { themeName: input.theme_name, previousThemeName: previous },
    };
  }

  async execute(input: SetCurrentThemeInput): Promise<OperationResult> {
    const previous = await this.checkListed(input.theme_name);
    await this.client.setCurrentTheme(input.theme_name);
    return {
      summary: `The dashboard uses ${input.theme_name} now; it was ${previous}.`,
      data: { themeName: input.theme_name, previousThemeName: previous },
    };
  }

  private async checkListed(themeName: string): Promise<string> {
    const themes = await this.client.listThemes();
    const names = themes.map((theme) => theme.themeName);
    if (!names.includes(themeName)) {
      throw new UnknownValueError("theme", themeName, names);
    }
    return this.client.getCurrentTheme();
  }
}
