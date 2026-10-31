import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CodeExecutionDeps, CodeExecutionOutcome } from "@/Protocols/CodeProtocol.ts";
import type { ToolDefinition, ToolOutcome } from "@/Protocols/OperationProtocol.ts";
import type { SandboxResult } from "@/Protocols/SandboxProtocol.ts";
import { CodeApiService } from "@/Services/CodeApiService.ts";
import { InputStripUtil } from "@/Utils/InputStripUtil.ts";
import { RedactUtil } from "@/Utils/RedactUtil.ts";

const TIERS_A_SCRIPT_CANNOT_CONFIRM: ReadonlySet<RiskTier> = new Set<RiskTier>(["destructive", "critical"]);

export class CodeExecutionService {
  private readonly apiPathToTool: ReadonlyMap<string, ToolDefinition>;

  constructor(private readonly deps: CodeExecutionDeps) {
    this.apiPathToTool = new Map(deps.tools.map((tool) => [CodeApiService.buildPath(tool.name), tool]));
  }

  async execute(script: string): Promise<CodeExecutionOutcome> {
    const result = await this.deps.sandbox.run({
      script,
      apiNames: [...this.apiPathToTool.keys()],
      hostCall: (apiName, args) => this.callOperation(apiName, args),
    });
    return this.buildOutcome(result);
  }

  private async callOperation(apiName: string, args: unknown): Promise<unknown> {
    const tool = this.apiPathToTool.get(apiName);
    if (tool === undefined) {
      throw new Error(`caprover.${apiName} does not exist. Use \`search\` to find the operations.`);
    }
    const input = CodeExecutionService.stripConfirmation(args);
    const outcome = await this.runTool(tool, input);
    if (outcome.isError) {
      throw new Error(outcome.summary);
    }
    return outcome.data;
  }

  private async runTool(tool: ToolDefinition, input: Record<string, unknown>): Promise<ToolOutcome> {
    const first = await tool.call(input);
    const isPreviewOnly = first.data.requires_confirmation === true && TIERS_A_SCRIPT_CANNOT_CONFIRM.has(tool.risk);
    if (first.isError || !isPreviewOnly || input.dry_run === true) {
      return first;
    }
    if (!this.deps.isElicitationAvailable()) {
      return {
        isError: true,
        summary: `Refused: ${tool.name} is a ${tool.risk} operation and a script cannot confirm it. This client cannot ask the person `
          + `directly, so nothing changed. Call \`${tool.name}\` as a named tool (CAPROVER_MCP_SURFACE=both), `
          + "or pass dry_run: true in the script to preview it.",
        data: {},
      };
    }
    // Why: the person is asked through the client by the runner once the token is accepted; a script never sees the token.
    const token = first.data.confirmation_token;
    return tool.call({ ...input, user_confirmed: true, confirmation_token: token });
  }

  private static stripConfirmation(args: unknown): Record<string, unknown> {
    const isRecord = typeof args === "object" && args !== null && !Array.isArray(args);
    return isRecord ? InputStripUtil.stripConfirmationFields(args) : {};
  }

  private buildOutcome(result: SandboxResult): CodeExecutionOutcome {
    const { secrets } = this.deps;
    const data = {
      output: RedactUtil.redactText(result.output, secrets),
      isTruncated: result.isTruncated,
      logs: result.logs.map((line) => RedactUtil.redactText(line, secrets)),
      hostCalls: result.hostCalls,
      ...(result.error === undefined ? {} : { error: RedactUtil.redactText(result.error, secrets) }),
      ...(result.line === undefined ? {} : { line: result.line }),
      ...(result.limit === undefined ? {} : { limit: result.limit }),
    };
    if (result.isOk) {
      const cut = result.isTruncated ? " The output was cut at the output limit: return less, for example only the fields you need." : "";
      return { isError: false, summary: `The script finished with ${result.hostCalls} calls.${cut}`, data };
    }
    const where = result.line === undefined ? "" : ` at line ${result.line}`;
    const limit = result.limit === undefined ? "" : ` Limit hit: ${result.limit}.`;
    return { isError: true, summary: `The script failed${where}: ${data.error ?? "unknown error"}${limit}`, data };
  }
}
