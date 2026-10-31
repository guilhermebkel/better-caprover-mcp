import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { FindIssuesInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { FindIssuesInputSchema } from "@/Schemas/AppInputSchema.ts";
import { FindIssuesOutputSchema } from "@/Schemas/AppOutputSchema.ts";
import type { DiagnosisService } from "@/Services/DiagnosisService.ts";
import { FindingSummaryUtil } from "@/Utils/FindingSummaryUtil.ts";
import { ListUtil } from "@/Utils/ListUtil.ts";

export class FindIssuesOperation implements OperationPort<FindIssuesInput> {
  static readonly NAME = "findIssues";

  readonly description = "Read-only. Runs the diagnosis rules over all apps and over the server (disk, unused images, root domain "
    + "SSL, a CapRover update) and returns the findings, the most severe first. Use it to find what needs attention; "
    + "to check one app in full, use `diagnose_app`. It reads the logs only of apps that show another sign. "
    + "It returns `findings`, `total` and `isTruncated`; raise `limit` or set `name_contains` when `isTruncated` is true.";

  readonly inputSchema = FindIssuesInputSchema;

  readonly outputSchema = FindIssuesOutputSchema;

  readonly risk: RiskTier = "read";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly diagnosis: DiagnosisService,
  ) {}

  async execute(input: FindIssuesInput): Promise<OperationResult> {
    const { apps } = await this.client.listApps();
    const text = input.name_contains?.toLowerCase();
    const matching = apps.filter((app) => text === undefined || app.appName.toLowerCase().includes(text));
    const screen = await this.diagnosis.findAppsIssues(matching);
    const server = text === undefined ? await this.diagnosis.findServerIssues() : { findings: [], skippedChecks: [] };
    const ranked = FindingSummaryUtil.rankFindings([...screen.findings, ...server.findings]);
    const shown = ranked.slice(0, input.limit ?? ListUtil.DEFAULT_LIMIT);
    const isTruncated = ranked.length > shown.length;
    const nextStep = `${ranked.length - shown.length} more findings. Raise \`limit\` (at most 200) or set \`name_contains\`.`;
    const head = ranked.length === 0
      ? "No finding was produced by the rules."
      : `${FindingSummaryUtil.countBySeverity(ranked)}; showing ${shown.length}.`;
    const skipped = FindIssuesOperation.describeSkips(screen.isRuntimeSkipped, server.skippedChecks);
    const more = isTruncated ? ` ${nextStep}` : "";
    return {
      summary: `${head} Checked ${screen.appsChecked} apps, read the logs of ${screen.appsRead}.${skipped}${more}`,
      data: {
        findings: shown,
        total: ranked.length,
        isTruncated,
        ...(isTruncated ? { nextStep } : {}),
        appsChecked: screen.appsChecked,
        appsRead: screen.appsRead,
        skippedChecks: [...(screen.isRuntimeSkipped ? ["runtime"] : []), ...server.skippedChecks],
      },
    };
  }

  private static describeSkips(isRuntimeSkipped: boolean, skippedChecks: readonly string[]): string {
    const runtime = isRuntimeSkipped ? " Runtime rules were skipped because CapRover gave no runtime." : "";
    const server = skippedChecks.length > 0 ? ` Server checks skipped: ${skippedChecks.join(", ")}.` : "";
    return `${runtime}${server}`;
  }
}
