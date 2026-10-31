import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetCurrentThemeInputSchema } from "@/Schemas/AccountInputSchema.ts";
import { GetCurrentThemeOutputSchema } from "@/Schemas/AccountOutputSchema.ts";

export class GetCurrentThemeOperation implements OperationPort<Record<string, never>> {
  static readonly NAME = "getCurrentTheme";

  readonly description = "Read-only. Reads the name of the dashboard theme in use. "
    + "Use it before `set_current_theme`; to see all themes, use `list_themes`. It always returns one name.";

  readonly inputSchema = GetCurrentThemeInputSchema;

  readonly outputSchema = GetCurrentThemeOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(): Promise<OperationResult> {
    const themeName = await this.client.getCurrentTheme();
    return { summary: `The dashboard uses the theme ${themeName}.`, data: { themeName } };
  }
}
