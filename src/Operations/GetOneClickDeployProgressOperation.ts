import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { JobIdInput } from "@/Protocols/OneClickInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { GetOneClickDeployProgressInputSchema } from "@/Schemas/OneClickInputSchema.ts";
import { GetOneClickDeployProgressOutputSchema } from "@/Schemas/OneClickOutputSchema.ts";

export class GetOneClickDeployProgressOperation implements OperationPort<JobIdInput> {
  static readonly NAME = "getOneClickDeployProgress";

  readonly description = "Read-only. Reads the progress of a one-click install: the steps, the current step, and the error or "
    + "the success message. Use it with the `jobId` that `deploy_one_click` returned. "
    + "`isFinished` means CapRover ended the job, not that the apps run: read `get_app_runtime` to check. "
    + "`hasFailed` is true when CapRover gave an error message.";

  readonly inputSchema = GetOneClickDeployProgressInputSchema;

  readonly outputSchema = GetOneClickDeployProgressOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: JobIdInput): Promise<OperationResult> {
    const progress = await this.client.getOneClickDeployProgress(input.job_id);
    const hasFailed = progress.errorMessage !== undefined;
    const isFinished = hasFailed || progress.successMessage !== undefined;
    return {
      summary: `Job ${input.job_id}: step ${progress.currentStep} of ${progress.steps.length}, `
        + `${isFinished ? "finished" : "running"}.`,
      data: {
        hasFailed,
        isFinished,
        jobId: input.job_id,
        steps: progress.steps,
        currentStep: progress.currentStep,
        errorMessage: progress.errorMessage,
        successMessage: progress.successMessage,
      },
    };
  }
}
