import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { StartBuildInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { StartBuildInputSchema } from "@/Schemas/AppInputSchema.ts";
import { StartBuildOutputSchema } from "@/Schemas/AppOutputSchema.ts";

export class StartBuildOperation implements OperationPort<StartBuildInput> {
  static readonly NAME = "startBuild";

  readonly description = "Starts a build of an app that is wired to a repository, through the build webhook path of that app. "
    + "Use it to rebuild from the latest commit; to run an image instead, use `deploy_image`. "
    + "The webhook path holds a secret token, so it is never returned. "
    + "It returns when CapRover accepts the build; read `get_build_logs` for the result. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = StartBuildInputSchema;

  readonly outputSchema = StartBuildOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  describeChange(): Promise<OperationResult> {
    return Promise.resolve({
      summary: "Would call the build webhook of an app. The webhook path is hidden because it holds a token.",
      data: { isStarted: false },
    });
  }

  async execute(input: StartBuildInput): Promise<OperationResult> {
    await this.client.startBuild(input.webhook_path);
    return { summary: "CapRover accepted the build. Read `get_build_logs` to follow it.", data: { isStarted: true } };
  }
}
