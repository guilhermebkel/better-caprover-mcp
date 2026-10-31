import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import type { TemplateNameInput } from "@/Protocols/OneClickInputProtocol.ts";
import { GetOneClickAppInputSchema } from "@/Schemas/OneClickInputSchema.ts";
import { GetOneClickAppOutputSchema } from "@/Schemas/OneClickOutputSchema.ts";

export class GetOneClickAppOperation implements OperationPort<TemplateNameInput> {
  static readonly NAME = "getOneClickApp";

  readonly description = "Read-only. Reads one one-click app template: its display name and the variables it asks for, "
    + "each with a label, a description and a default. Use it before `deploy_one_click` to know which values to give. "
    + "To find template names, use `list_one_click_apps`. A variable with no default must be set.";

  readonly inputSchema = GetOneClickAppInputSchema;

  readonly outputSchema = GetOneClickAppOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: TemplateNameInput): Promise<OperationResult> {
    const template = await this.client.getOneClickApp(input.template_name);
    return {
      summary: `${template.displayName} asks for ${template.variables.length} variables.`,
      data: { templateName: input.template_name, displayName: template.displayName, variables: template.variables },
    };
  }
}
