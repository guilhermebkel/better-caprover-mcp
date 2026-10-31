import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { AddOneClickRepoInput } from "@/Protocols/OneClickInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { AddOneClickRepoInputSchema } from "@/Schemas/OneClickInputSchema.ts";
import { AddOneClickRepoOutputSchema } from "@/Schemas/OneClickOutputSchema.ts";

export class AddOneClickRepoOperation implements OperationPort<AddOneClickRepoInput> {
  static readonly NAME = "addOneClickRepo";

  readonly description = "Adds a repository that CapRover reads one-click apps from. "
    + "Use it only for a repository the person trusts: its templates run containers on the server. "
    + "To see the current ones, use `list_one_click_repos`. It returns the URL. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = AddOneClickRepoInputSchema;

  readonly outputSchema = AddOneClickRepoOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: AddOneClickRepoInput): Promise<OperationResult> {
    const urls = await this.client.listOneClickRepos();
    const isKnown = urls.includes(input.repository_url);
    return {
      summary: `Would add ${input.repository_url}. ${isKnown ? "It is listed already." : "It is not listed yet."}`,
      data: { repositoryUrl: input.repository_url, isAlreadyListed: isKnown },
    };
  }

  async execute(input: AddOneClickRepoInput): Promise<OperationResult> {
    await this.client.addOneClickRepo(input.repository_url);
    return { summary: `Added ${input.repository_url}.`, data: { repositoryUrl: input.repository_url } };
  }
}
