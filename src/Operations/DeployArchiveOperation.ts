import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { DeployArchiveInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { DeployArchiveInputSchema } from "@/Schemas/AppInputSchema.ts";
import { DeployArchiveOutputSchema } from "@/Schemas/AppOutputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";

export class DeployArchiveOperation implements OperationPort<DeployArchiveInput> {
  static readonly NAME = "deployArchive";

  readonly description = "Uploads a tar archive of source code to an existing app and lets CapRover build and deploy it. "
    + "Use it when there is no image; if there is one, use `deploy_image`. The archive needs a `captain-definition` file at its root. "
    + "It returns when CapRover accepts the upload, not when the build ends: read `get_build_logs`. "
    + "It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = DeployArchiveInputSchema;

  readonly outputSchema = DeployArchiveOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: DeployArchiveInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const archiveBytes = Buffer.from(input.source_archive, "base64").byteLength;
    return {
      summary: `Would upload an archive of ${archiveBytes} bytes to ${app.appName}, which runs ${app.imageName ?? "no image"} now.`,
      data: { appName: app.appName, archiveBytes },
    };
  }

  async execute(input: DeployArchiveInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const archive = Buffer.from(input.source_archive, "base64");
    await this.client.uploadAppArchive(app.appName, archive);
    return {
      summary: `CapRover accepted the archive of ${archive.byteLength} bytes for ${app.appName}. The build goes on in the background.`,
      data: { appName: app.appName, archiveBytes: archive.byteLength },
    };
  }
}
