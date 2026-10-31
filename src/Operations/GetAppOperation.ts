import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { AppNameInput } from "@/Protocols/AppInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { AppNameInputSchema } from "@/Schemas/AppInputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";
import { AppViewUtil } from "@/Utils/AppViewUtil.ts";

export class GetAppOperation implements OperationPort<AppNameInput> {
  static readonly NAME = "getApp";

  readonly description = "Read-only. Reads the configuration of one app: URL, instances, image, domains, ports, volumes "
    + "and the names of its env vars. Use it before changing an app. For live state, use `get_app_runtime`. "
    + "It never returns env var values: each variable has only `key` and `isSet`. "
    + "If the app does not exist, it returns an error with the closest app names.";

  readonly inputSchema = AppNameInputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly resolver: AppResolverService) {}

  async execute(input: AppNameInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    return { summary: `App ${app.appName} runs ${app.instanceCount} instances.`, data: AppViewUtil.buildDetailed(app) };
  }
}
