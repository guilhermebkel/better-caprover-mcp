import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort, CaproverOneClickTemplate, OneClickVariableValue } from "@/Protocols/CaproverClientProtocol.ts";
import type { DeployOneClickInput } from "@/Protocols/OneClickInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ToolFailureError } from "@/Errors/ToolFailureError.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { DeployOneClickInputSchema } from "@/Schemas/OneClickInputSchema.ts";
import { DeployOneClickOutputSchema } from "@/Schemas/OneClickOutputSchema.ts";

export class DeployOneClickOperation implements OperationPort<DeployOneClickInput> {
  static readonly NAME = "deployOneClick";

  readonly description = "Starts the install of a one-click app, such as a database, and returns a `jobId` at once. "
    + "Use it after `get_one_click_app` shows the variables; to follow the install, use `get_one_click_deploy_progress`. "
    + "A finished status does not prove the apps serve traffic; read `get_app_runtime` for each app it made. "
    + "It writes to the server; with `dry_run` it only checks the variables.";

  readonly inputSchema = DeployOneClickInputSchema;

  readonly outputSchema = DeployOneClickOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: DeployOneClickInput): Promise<OperationResult> {
    const template = await this.client.getOneClickApp(input.template_name);
    const { missingVariableIds } = DeployOneClickOperation.buildValues(template, input);
    const outcome = missingVariableIds.length === 0 ? "All variables are set." : `These variables have no value: ${missingVariableIds.join(", ")}.`;
    return {
      summary: `Would install ${template.displayName}. ${outcome}`,
      data: { templateName: input.template_name, missingVariableIds },
    };
  }

  async execute(input: DeployOneClickInput): Promise<OperationResult> {
    const template = await this.client.getOneClickApp(input.template_name);
    const { values, missingVariableIds } = DeployOneClickOperation.buildValues(template, input);
    if (missingVariableIds.length > 0) {
      throw new ToolFailureError(
        `These variables have no value and no default: ${missingVariableIds.join(", ")}. Set them in \`variables\`.`,
      );
    }
    const jobId = await this.client.startOneClickDeploy(input.template_name, values);
    return {
      summary: `CapRover started the install of ${template.displayName}. Read \`get_one_click_deploy_progress\` with this job id.`,
      data: { templateName: input.template_name, jobId, missingVariableIds },
    };
  }

  private static buildValues(
    template: CaproverOneClickTemplate,
    input: DeployOneClickInput,
  ): {
    values: OneClickVariableValue[]; missingVariableIds: string[];
  } {
    const validIds = template.variables.map((variable) => variable.variableId);
    const given = input.variables ?? [];
    const unknown = given.find((entry) => !validIds.includes(entry.variable_id));
    if (unknown !== undefined) {
      throw new UnknownValueError("variable", unknown.variable_id, validIds);
    }
    const values = template.variables.flatMap((variable): OneClickVariableValue[] => {
      const match = given.find((entry) => entry.variable_id === variable.variableId);
      const value = match?.variable_value ?? variable.defaultValue;
      return value === undefined ? [] : [{ variableId: variable.variableId, value }];
    });
    const hasValue = (variableId: string): boolean => values.some((entry) => entry.variableId === variableId);
    return { values, missingVariableIds: validIds.filter((variableId) => !hasValue(variableId)) };
  }
}
