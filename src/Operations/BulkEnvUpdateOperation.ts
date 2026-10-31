import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { BulkEnvUpdateInput } from "@/Protocols/AppInputProtocol.ts";
import type { AppEnvVarsPlan } from "@/Protocols/SetEnvVarsProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { BulkEnvUpdateInputSchema } from "@/Schemas/AppInputSchema.ts";
import { BulkEnvUpdateOutputSchema } from "@/Schemas/AppOutputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";
import { BatchUtil } from "@/Utils/BatchUtil.ts";
import { EnvVarsPlanUtil } from "@/Utils/EnvVarsPlanUtil.ts";

export class BulkEnvUpdateOperation implements OperationPort<BulkEnvUpdateInput> {
  static readonly NAME = "bulkEnvUpdate";

  readonly description = "Sets and deletes the same env vars on several apps, one by one in the order given, and stops at the first "
    + "failure. Use it to roll one setting out to many apps; to change one app, use `set_env_vars`. "
    + "CapRover restarts each app it changes. It returns `applied` and `notApplied`, never a value; there is no transaction. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = BulkEnvUpdateInputSchema;

  readonly outputSchema = BulkEnvUpdateOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: BulkEnvUpdateInput): Promise<OperationResult> {
    const plans = await this.buildPlans(input);
    const summaries = plans.map((plan) => `${plan.appName} (${plan.addedKeys.length} added, ${plan.updatedKeys.length} updated, `
      + `${plan.removedKeys.length} removed)`);
    return {
      summary: `Would change env vars of ${plans.length} apps, in this order: ${summaries.join("; ")}. CapRover restarts each app.`,
      data: { plans: plans.map((plan) => BulkEnvUpdateOperation.buildPlanRow(plan)) },
    };
  }

  async execute(input: BulkEnvUpdateInput): Promise<OperationResult> {
    const plans = await this.buildPlans(input);
    const appNameToPlan = new Map(plans.map((plan) => [plan.appName, plan]));
    const outcome = await BatchUtil.run(input.app_names, async (appName) => {
      const plan = appNameToPlan.get(appName);
      if (plan === undefined) {
        throw new UnknownValueError("app", appName, [...appNameToPlan.keys()]);
      }
      await this.client.setEnvVars(appName, plan.merged);
    });
    const result = BatchUtil.buildResult({ pastVerb: "Changed env vars of", noun: "apps", outcome });
    const rows = plans.map((plan) => BulkEnvUpdateOperation.buildPlanRow(plan));
    return { ...result, data: { ...result.data, plans: rows } };
  }

  private async buildPlans(input: BulkEnvUpdateInput): Promise<AppEnvVarsPlan[]> {
    const apps = await this.resolver.getApps(input.app_names);
    return apps.map((app) => ({ appName: app.appName, ...EnvVarsPlanUtil.build(app, input) }));
  }

  private static buildPlanRow(plan: AppEnvVarsPlan): Record<string, unknown> {
    return {
      appName: plan.appName,
      addedKeys: plan.addedKeys,
      updatedKeys: plan.updatedKeys,
      removedKeys: plan.removedKeys,
    };
  }
}
