import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { ScaleAppInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ScaleAppInputSchema } from "@/Schemas/AppInputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";

export class ScaleAppOperation implements OperationPort<ScaleAppInput> {
  static readonly NAME = "scaleApp";

  readonly description = "Sets how many copies of one app run. Use it to add copies or to stop the app with 0; "
    + "to see the state after the change, use `get_app_runtime`. CapRover restarts the app's containers. "
    + "It returns the old and the new number of instances. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = ScaleAppInputSchema;

  readonly risk: RiskTier = "write";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: ScaleAppInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    return {
      summary: `Would change ${app.appName} from ${app.instanceCount} to ${input.instance_count} instances.`,
      data: { appName: app.appName, previousInstanceCount: app.instanceCount, instanceCount: input.instance_count },
    };
  }

  async execute(input: ScaleAppInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    await this.client.setInstanceCount(app.appName, input.instance_count);
    return {
      summary: `Changed ${app.appName} from ${app.instanceCount} to ${input.instance_count} instances.`,
      data: { appName: app.appName, previousInstanceCount: app.instanceCount, instanceCount: input.instance_count },
    };
  }
}
