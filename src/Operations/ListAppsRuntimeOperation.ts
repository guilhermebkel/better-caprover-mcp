import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { ListAppsRuntimeField } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ListAppsRuntimeInputSchema } from "@/Schemas/AppInputSchema.ts";
import { ListAppsRuntimeOutputSchema } from "@/Schemas/AppOutputSchema.ts";
import { ListUtil } from "@/Utils/ListUtil.ts";

export class ListAppsRuntimeOperation implements OperationPort<ListInput<ListAppsRuntimeField>> {
  static readonly NAME = "listAppsRuntime";

  readonly description = "Read-only. Lists the live state of every app in one call: status, wanted and running instances. "
    + "Use it to find which apps are down; for the tasks and the latest failure of one app, use `get_app_runtime`. "
    + "It returns `apps` (empty when there are none), `total` and `isTruncated`; raise `limit` or set `filter` "
    + "when `isTruncated` is true.";

  readonly inputSchema = ListAppsRuntimeInputSchema;

  readonly outputSchema = ListAppsRuntimeOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: ListInput<ListAppsRuntimeField>): Promise<OperationResult> {
    const runtimes = await this.client.listAppsRuntime();
    const rows = runtimes.map((runtime) => ({
      appName: runtime.appName,
      status: runtime.status,
      desiredInstances: runtime.desiredInstances,
      runningInstances: runtime.runningInstances,
      collectionError: runtime.collectionError,
    }));
    return ListUtil.buildResult({ noun: "apps", rows, input });
  }
}
