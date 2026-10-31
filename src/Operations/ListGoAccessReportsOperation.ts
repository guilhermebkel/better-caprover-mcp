import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ListGoAccessReportsInput } from "@/Protocols/MonitoringInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ListGoAccessReportsInputSchema } from "@/Schemas/MonitoringInputSchema.ts";
import { ListGoAccessReportsOutputSchema } from "@/Schemas/MonitoringOutputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";
import { ListUtil } from "@/Utils/ListUtil.ts";

export class ListGoAccessReportsOperation implements OperationPort<ListGoAccessReportsInput> {
  static readonly NAME = "listGoAccessReports";

  readonly description = "Read-only. Lists the GoAccess traffic reports of one app: domain, report name, last change and URL. "
    + "Use it to see which reports exist; to turn the reports on, use `set_go_access`. "
    + "It returns `reports` (empty when GoAccess is off or has no data yet), `total` and `isTruncated`; "
    + "raise `limit` or set `filter` when `isTruncated` is true.";

  readonly inputSchema = ListGoAccessReportsInputSchema;

  readonly outputSchema = ListGoAccessReportsOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async execute(input: ListGoAccessReportsInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const rows = await this.client.listGoAccessReports(app.appName);
    return ListUtil.buildResult({ noun: "reports", rows, input });
  }
}
