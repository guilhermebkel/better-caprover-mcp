import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { SaveThemeInput } from "@/Protocols/AccountInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { SaveThemeInputSchema } from "@/Schemas/AccountInputSchema.ts";
import { SaveThemeOutputSchema } from "@/Schemas/AccountOutputSchema.ts";

export class SaveThemeOperation implements OperationPort<SaveThemeInput> {
  static readonly NAME = "saveTheme";

  readonly description = "Creates a dashboard theme from CSS, or replaces the CSS of one, or renames it with `previous_name`. "
    + "Use it to restyle the dashboard; to switch to it afterwards, use `set_current_theme`. "
    + "A broken CSS makes the dashboard hard to read until another theme is chosen. It returns the theme name. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = SaveThemeInputSchema;

  readonly outputSchema = SaveThemeOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: SaveThemeInput): Promise<OperationResult> {
    const isNewTheme = await this.isNew(input);
    return {
      summary: `Would ${isNewTheme ? "create" : "replace"} the theme ${input.theme_name} with ${input.theme_content.length} characters of CSS.`,
      data: { themeName: input.theme_name, isNewTheme },
    };
  }

  async execute(input: SaveThemeInput): Promise<OperationResult> {
    const isNewTheme = await this.isNew(input);
    await this.client.saveTheme({
      previousName: input.previous_name ?? "",
      themeName: input.theme_name,
      content: input.theme_content,
    });
    return {
      summary: `${isNewTheme ? "Created" : "Replaced"} the theme ${input.theme_name}.`,
      data: { themeName: input.theme_name, isNewTheme },
    };
  }

  private async isNew(input: SaveThemeInput): Promise<boolean> {
    const themes = await this.client.listThemes();
    const lookupName = input.previous_name ?? input.theme_name;
    return !themes.some((theme) => theme.themeName === lookupName);
  }
}
