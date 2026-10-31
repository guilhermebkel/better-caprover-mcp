import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import type { ListOneClickReposField } from "@/Protocols/OneClickInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ListOneClickReposInputSchema } from "@/Schemas/OneClickInputSchema.ts";
import { ListOneClickReposOutputSchema } from "@/Schemas/OneClickOutputSchema.ts";
import { ListUtil } from "@/Utils/ListUtil.ts";

export class ListOneClickReposOperation implements OperationPort<ListInput<ListOneClickReposField>> {
  static readonly NAME = "listOneClickRepos";

  readonly description = "Read-only. Lists the repositories CapRover reads one-click apps from. "
    + "Use it before `add_one_click_repo` or `delete_one_click_repo`; to see the apps, use `list_one_click_apps`. "
    + "It returns `repositories`, `total` and `isTruncated`; raise `limit` or set `filter` when `isTruncated` is true.";

  readonly inputSchema = ListOneClickReposInputSchema;

  readonly outputSchema = ListOneClickReposOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: ListInput<ListOneClickReposField>): Promise<OperationResult> {
    const urls = await this.client.listOneClickRepos();
    const rows = urls.map((repositoryUrl) => ({ repositoryUrl }));
    return ListUtil.buildResult({ noun: "repositories", rows, input });
  }
}
