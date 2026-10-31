import { z } from "zod";
import { ConcurrencyLimitError } from "@/Errors/ConcurrencyLimitError.ts";
import { MissingPreviewError } from "@/Errors/MissingPreviewError.ts";
import { OperationDeniedError } from "@/Errors/OperationDeniedError.ts";
import { ToolFailureError } from "@/Errors/ToolFailureError.ts";
import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { AuditResult } from "@/Protocols/AuditLogProtocol.ts";
import type { OperationRunnerDeps } from "@/Protocols/OperationRunnerProtocol.ts";
import type { ControlFields } from "@/Protocols/ControlProtocol.ts";
import type { OperationPort, OperationResult, ToolDefinition, ToolOutcome } from "@/Protocols/OperationProtocol.ts";
import { ControlFieldsSchema } from "@/Schemas/ControlSchema.ts";
import { FingerprintUtil } from "@/Utils/FingerprintUtil.ts";
import { InputStripUtil } from "@/Utils/InputStripUtil.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";
import { OperationBuilderUtil } from "@/Utils/OperationBuilderUtil.ts";
import { RedactUtil } from "@/Utils/RedactUtil.ts";

const TIERS_NEEDING_CONFIRMATION: ReadonlySet<RiskTier> = new Set<RiskTier>(["destructive", "critical"]);

export class OperationRunnerService {
  constructor(private readonly deps: OperationRunnerDeps) {}

  buildTool<Input>(operationName: string, operation: OperationPort<Input>): ToolDefinition {
    const toolName = OperationBuilderUtil.buildToolName(operationName);
    const call = (rawInput: unknown): Promise<ToolOutcome> => this.run(toolName, operation, rawInput);
    const { description, risk } = operation;
    return { name: toolName, inputSchema: operation.inputSchema, description, risk, call };
  }

  private async run<Input>(toolName: string, operation: OperationPort<Input>, rawInput: unknown): Promise<ToolOutcome> {
    try {
      return await this.deps.limiter.run(async () => {
        try {
          this.deps.policy.assertCanRun(toolName, operation.risk);
          const control = ControlFieldsSchema.parse(rawInput);
          const input = operation.inputSchema.parse(InputStripUtil.stripControlFields(rawInput));
          const outcome = await this.dispatch(toolName, operation, input, control);
          this.writeAudit(toolName, operation.risk, outcome.isError ? "error" : "ok");
          return this.redactOutcome(outcome);
        } catch (error) {
          const result: AuditResult = error instanceof OperationDeniedError ? "denied" : "error";
          const outcome = this.redactOutcome(OperationRunnerService.buildFailure(toolName, error));
          this.writeAudit(toolName, operation.risk, result);
          return outcome;
        }
      });
    } catch (error) {
      const outcome = this.redactOutcome(OperationRunnerService.buildFailure(toolName, error));
      this.writeAudit(toolName, operation.risk, "error");
      return outcome;
    }
  }

  private writeAudit(tool: string, risk: RiskTier, result: AuditResult): void {
    this.deps.audit.write({ tool, risk, result, atMs: this.deps.getNowMs() });
  }

  private async dispatch<Input>(
    toolName: string,
    operation: OperationPort<Input>,
    input: Input,
    control: ControlFields,
  ): Promise<ToolOutcome> {
    if (operation.risk === "read") {
      return OperationRunnerService.buildDone(await operation.execute(input));
    }
    if (control.dry_run === true) {
      const preview = await OperationRunnerService.runPreview(toolName, operation, input);
      const summary = `Dry run, nothing changed. ${preview.summary}`;
      return { data: { ...preview.data, dry_run: true }, isError: false, summary };
    }
    if (!TIERS_NEEDING_CONFIRMATION.has(operation.risk)) {
      return OperationRunnerService.buildDone(await operation.execute(input));
    }
    return this.confirmAndRun(toolName, operation, input, control);
  }

  private async confirmAndRun<Input>(
    toolName: string,
    operation: OperationPort<Input>,
    input: Input,
    control: ControlFields,
  ): Promise<ToolOutcome> {
    const fingerprint = FingerprintUtil.build(toolName, input);
    const token = control.confirmation_token;
    const hasToken = control.user_confirmed === true && token !== undefined;
    const isConfirmed = hasToken && this.deps.confirmation.consumeToken(token, fingerprint);
    if (isConfirmed) {
      return OperationRunnerService.buildDone(await operation.execute(input));
    }
    const preview = await OperationRunnerService.runPreview(toolName, operation, input);
    const newToken = this.deps.confirmation.createToken(fingerprint);
    const wasRefused = control.user_confirmed === true;
    const reason = wasRefused ? "The confirmation token is missing, expired, or from a different call. " : "";
    return {
      isError: wasRefused,
      summary: `${reason}Not run. ${preview.summary} Show this to the person. Only if they say yes, call ${toolName} again `
        + "with the same inputs, user_confirmed true and this confirmation_token.",
      data: { requires_confirmation: true, confirmation_token: newToken, ...preview.data },
    };
  }

  private static async runPreview<Input>(
    toolName: string,
    operation: OperationPort<Input>,
    input: Input,
  ): Promise<OperationResult> {
    if (operation.describeChange === undefined) {
      throw new MissingPreviewError(toolName);
    }
    return operation.describeChange(input);
  }

  private static buildDone(result: OperationResult): ToolOutcome {
    return { isError: false, summary: result.summary, data: result.data };
  }

  private static buildFailure(toolName: string, error: unknown): ToolOutcome {
    if (error instanceof z.ZodError) {
      return { isError: true, summary: `Invalid input for ${toolName}:\n${z.prettifyError(error)}`, data: {} };
    }
    const isToolFailure = error instanceof ToolFailureError
      || error instanceof OperationDeniedError
      || error instanceof ConcurrencyLimitError;
    if (isToolFailure) {
      return { isError: true, summary: error.message, data: {} };
    }
    LogUtil.logError("unexpected_failure", error instanceof Error ? error.name : "unknown");
    return { isError: true, summary: `${toolName} failed with an unexpected error. The server logged its type.`, data: {} };
  }

  private redactOutcome(outcome: ToolOutcome): ToolOutcome {
    const data = RedactUtil.redactValue(outcome.data, this.deps.secrets);
    return {
      isError: outcome.isError,
      summary: RedactUtil.redactText(outcome.summary, this.deps.secrets),
      data: typeof data === "object" && data !== null && !Array.isArray(data) ? Object.fromEntries(Object.entries(data)) : {},
    };
  }
}
