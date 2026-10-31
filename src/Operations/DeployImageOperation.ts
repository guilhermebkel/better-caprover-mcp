import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { DeployImageInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { DeployImageInputSchema } from "@/Schemas/AppInputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";
import { DeployImageOutputSchema } from "@/Schemas/AppOutputSchema.ts";

export class DeployImageOperation implements OperationPort<DeployImageInput> {
  static readonly NAME = "deployImage";

  readonly description = "Deploys a Docker image to an existing app, which replaces the version that runs now. "
    + "Use it to release or roll back to an image; to make the app first, use `create_app`. "
    + "It returns when CapRover accepts the deploy, not when the app runs: the deploy goes on in the background, "
    + "so read `get_app_runtime` and, if it fails, `get_build_logs`. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = DeployImageInputSchema;

  readonly outputSchema = DeployImageOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: DeployImageInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    return {
      summary: `Would deploy ${input.image_name} to ${app.appName}, which runs ${app.imageName ?? "no image"} now.`,
      data: { appName: app.appName, imageName: input.image_name, currentImageName: app.imageName },
    };
  }

  async execute(input: DeployImageInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    await this.client.deployImage(app.appName, input.image_name);
    return {
      summary: `CapRover accepted the deploy of ${input.image_name} to ${app.appName}. It runs in the background.`,
      data: { appName: app.appName, imageName: input.image_name, previousImageName: app.imageName },
    };
  }
}
