import type { EnvVarsPlan } from "@/Protocols/SetEnvVarsProtocol.ts";
import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { SetEnvVarsInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverApp, CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { SetEnvVarsInputSchema } from "@/Schemas/AppInputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";
import { EnvVarsPlanUtil } from "@/Utils/EnvVarsPlanUtil.ts";
import { SetEnvVarsOutputSchema } from "@/Schemas/AppOutputSchema.ts";

export class SetEnvVarsOperation implements OperationPort<SetEnvVarsInput> {
  static readonly NAME = "setEnvVars";

  readonly description = "Sets and deletes env vars of one app and keeps the other ones. Use it to change app settings; "
    + "to read the names of the current vars, use `get_app`. CapRover restarts the app after the change. "
    + "It returns the keys added, updated and removed, never a value. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = SetEnvVarsInputSchema;

  readonly outputSchema = SetEnvVarsOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: SetEnvVarsInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const plan = EnvVarsPlanUtil.build(app, input);
    return { summary: SetEnvVarsOperation.describePlan(app.appName, plan, "Would change"), data: SetEnvVarsOperation.buildData(app, plan) };
  }

  async execute(input: SetEnvVarsInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const plan = EnvVarsPlanUtil.build(app, input);
    await this.client.setEnvVars(app.appName, plan.merged);
    return { summary: SetEnvVarsOperation.describePlan(app.appName, plan, "Changed"), data: SetEnvVarsOperation.buildData(app, plan) };
  }

  private static describePlan(appName: string, plan: EnvVarsPlan, verb: string): string {
    return `${verb} env vars of ${appName}: ${plan.addedKeys.length} added, ${plan.updatedKeys.length} updated, `
      + `${plan.removedKeys.length} removed. CapRover restarts the app.`;
  }

  private static buildData(app: CaproverApp, plan: EnvVarsPlan): Record<string, unknown> {
    return {
      appName: app.appName,
      addedKeys: plan.addedKeys,
      updatedKeys: plan.updatedKeys,
      removedKeys: plan.removedKeys,
      totalKeysAfter: plan.merged.length,
    };
  }
}
