import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { ListProAlertsField } from "@/Protocols/AccountInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ListProAlertsInputSchema } from "@/Schemas/AccountInputSchema.ts";
import { ListProAlertsOutputSchema } from "@/Schemas/AccountOutputSchema.ts";
import { ListUtil } from "@/Utils/ListUtil.ts";

export class ListProAlertsOperation implements OperationPort<ListInput<ListProAlertsField>> {
  static readonly NAME = "listProAlerts";

  readonly description = "Read-only. Lists the CapRover Pro alerts: the event (such as a failed build) and the kind of action "
    + "(email or webhook). Use it to see what the server reports; the addresses and hook URLs are never returned. "
    + "It returns `alerts` (empty when none are set), `total` and `isTruncated`; raise `limit` or set `filter` when `isTruncated` is true.";

  readonly inputSchema = ListProAlertsInputSchema;

  readonly outputSchema = ListProAlertsOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: ListInput<ListProAlertsField>): Promise<OperationResult> {
    const rows = await this.client.listProAlerts();
    return ListUtil.buildResult({ noun: "alerts", rows, input });
  }
}
