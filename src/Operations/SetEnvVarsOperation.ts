import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { SetEnvVarsInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverApp, CaproverClientPort, CaproverEnvVar } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { SetEnvVarsInputSchema } from "@/Schemas/AppInputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";
import { DotenvUtil } from "@/Utils/DotenvUtil.ts";

type EnvVarsPlan = {
  merged: CaproverEnvVar[];
  addedKeys: string[];
  updatedKeys: string[];
  removedKeys: string[];
};

export class SetEnvVarsOperation implements OperationPort<SetEnvVarsInput> {
  static readonly NAME = "setEnvVars";

  readonly description = "Sets and deletes env vars of one app and keeps the other ones. Use it to change app settings; "
    + "to read the names of the current vars, use `get_app`. CapRover restarts the app after the change. "
    + "It returns the keys added, updated and removed, never a value. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = SetEnvVarsInputSchema;

  readonly risk: RiskTier = "write";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: SetEnvVarsInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const plan = SetEnvVarsOperation.buildPlan(app, input);
    return { summary: SetEnvVarsOperation.describePlan(app.appName, plan, "Would change"), data: SetEnvVarsOperation.buildData(app, plan) };
  }

  async execute(input: SetEnvVarsInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const plan = SetEnvVarsOperation.buildPlan(app, input);
    await this.client.setEnvVars(app.appName, plan.merged);
    return { summary: SetEnvVarsOperation.describePlan(app.appName, plan, "Changed"), data: SetEnvVarsOperation.buildData(app, plan) };
  }

  private static buildPlan(app: CaproverApp, input: SetEnvVarsInput): EnvVarsPlan {
    const requested = DotenvUtil.parse(input.env_vars ?? "");
    const removeKeys = new Set(input.remove_keys ?? []);
    const currentKeys = new Set(app.envVars.map((envVar) => envVar.key));
    const requestedKeys = new Set(requested.map((envVar) => envVar.key));
    const kept = app.envVars.filter((envVar) => !removeKeys.has(envVar.key) && !requestedKeys.has(envVar.key));
    return {
      merged: [...kept, ...requested.filter((envVar) => !removeKeys.has(envVar.key))],
      addedKeys: [...requestedKeys].filter((key) => !currentKeys.has(key) && !removeKeys.has(key)),
      updatedKeys: [...requestedKeys].filter((key) => currentKeys.has(key) && !removeKeys.has(key)),
      removedKeys: [...removeKeys].filter((key) => currentKeys.has(key)),
    };
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
