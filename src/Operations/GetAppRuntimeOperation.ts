import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { AppNameInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { AppNameInputSchema } from "@/Schemas/AppInputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";
import { GetAppRuntimeOutputSchema } from "@/Schemas/AppOutputSchema.ts";

export class GetAppRuntimeOperation implements OperationPort<AppNameInput> {
  static readonly NAME = "getAppRuntime";

  readonly description = "Read-only. Reads the live state of one app: status, wanted and running instances, the state "
    + "of each container task and the latest failure. Use it after a deploy or a scale to see if the app runs. "
    + "For the saved configuration, use `get_app`. For the output of a build, use `get_build_logs`. "
    + "`status` is `unknown` when CapRover reports a value this server does not know.";

  readonly inputSchema = AppNameInputSchema;

  readonly outputSchema = GetAppRuntimeOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async execute(input: AppNameInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const runtime = await this.client.getAppRuntime(app.appName);
    const running = runtime.runningInstances ?? "unknown";
    const wanted = runtime.desiredInstances ?? "unknown";
    return {
      summary: `App ${runtime.appName} is ${runtime.status}: ${running} of ${wanted} instances run.`,
      data: { ...runtime },
    };
  }
}
