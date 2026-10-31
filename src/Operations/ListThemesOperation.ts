import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { ListThemesField } from "@/Protocols/AccountInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { ListThemesInputSchema } from "@/Schemas/AccountInputSchema.ts";
import { ListThemesOutputSchema } from "@/Schemas/AccountOutputSchema.ts";
import { ListUtil } from "@/Utils/ListUtil.ts";

export class ListThemesOperation implements OperationPort<ListInput<ListThemesField>> {
  static readonly NAME = "listThemes";

  readonly description = "Read-only. Lists the dashboard themes: name and whether the theme is built in. "
    + "Use it to find a name for `set_current_theme` or `delete_theme`; to see the active one, use `get_current_theme`. "
    + "The CSS of a theme is not returned. It returns `themes`, `total` and `isTruncated`; raise `limit` or set `filter` when `isTruncated` is true.";

  readonly inputSchema = ListThemesInputSchema;

  readonly outputSchema = ListThemesOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(private readonly client: CaproverClientPort) {}

  async execute(input: ListInput<ListThemesField>): Promise<OperationResult> {
    const rows = await this.client.listThemes();
    return ListUtil.buildResult({ noun: "themes", rows, input });
  }
}
