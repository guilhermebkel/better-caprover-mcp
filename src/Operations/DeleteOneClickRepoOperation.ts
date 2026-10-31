import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { DeleteOneClickRepoInput } from "@/Protocols/OneClickInputProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { UnknownValueError } from "@/Errors/UnknownValueError.ts";
import { DeleteOneClickRepoInputSchema } from "@/Schemas/OneClickInputSchema.ts";
import { DeleteOneClickRepoOutputSchema } from "@/Schemas/OneClickOutputSchema.ts";

export class DeleteOneClickRepoOperation implements OperationPort<DeleteOneClickRepoInput> {
  static readonly NAME = "deleteOneClickRepo";

  readonly description = "Removes a custom one-click repository, so its apps leave the catalog; apps already installed stay. "
    + "Run it only when the person asked to remove this repository, never to tidy up. "
    + "To see the repositories, use `list_one_click_repos`. Without `user_confirmed` it only returns a preview and a `confirmation_token`.";

  readonly inputSchema = DeleteOneClickRepoInputSchema;

  readonly outputSchema = DeleteOneClickRepoOutputSchema;

  readonly risk: RiskTier = "destructive";

  constructor(private readonly client: CaproverClientPort) {}

  async describeChange(input: DeleteOneClickRepoInput): Promise<OperationResult> {
    await this.checkListed(input.repository_url);
    return {
      summary: `Would remove the repository ${input.repository_url}. Its apps leave the catalog.`,
      data: { repositoryUrl: input.repository_url },
    };
  }

  async execute(input: DeleteOneClickRepoInput): Promise<OperationResult> {
    await this.checkListed(input.repository_url);
    await this.client.deleteOneClickRepo(input.repository_url);
    return { summary: `Removed the repository ${input.repository_url}.`, data: { repositoryUrl: input.repository_url } };
  }

  private async checkListed(repositoryUrl: string): Promise<void> {
    const urls = await this.client.listOneClickRepos();
    if (!urls.includes(repositoryUrl)) {
      throw new UnknownValueError("repository", repositoryUrl, urls);
    }
  }
}
