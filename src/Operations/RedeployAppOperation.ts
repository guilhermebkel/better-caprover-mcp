import { NoImageToRedeployError } from "@/Errors/NoImageToRedeployError.ts";
import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { RedeployAppInput, RedeployTarget } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { RedeployAppInputSchema } from "@/Schemas/AppInputSchema.ts";
import { RedeployAppOutputSchema } from "@/Schemas/AppOutputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";

export class RedeployAppOperation implements OperationPort<RedeployAppInput> {
  static readonly NAME = "redeployApp";

  readonly description = "Sends again the image that an app runs now, so CapRover pulls it and restarts the app. "
    + "Use it to pick up a new image behind the same tag; to run another image, use `deploy_image`. "
    + "It returns when CapRover accepts the deploy, not when the app runs: read `get_app_runtime` after. "
    + "It fails for an app that has no image name. It writes to the server; with `dry_run` it changes nothing.";

  readonly inputSchema = RedeployAppInputSchema;

  readonly outputSchema = RedeployAppOutputSchema;

  readonly risk: RiskTier = "write";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: RedeployAppInput): Promise<OperationResult> {
    const { appName, imageName } = await this.readTarget(input);
    return {
      summary: `Would send ${imageName} again to ${appName}. CapRover restarts the app.`,
      data: { appName, imageName },
    };
  }

  async execute(input: RedeployAppInput): Promise<OperationResult> {
    const { appName, imageName } = await this.readTarget(input);
    await this.client.deployImage(appName, imageName);
    return {
      summary: `CapRover accepted the deploy of ${imageName} again to ${appName}. It runs in the background.`,
      data: { appName, imageName },
    };
  }

  private async readTarget(input: RedeployAppInput): Promise<RedeployTarget> {
    const app = await this.resolver.getApp(input.app_name);
    if (app.imageName === undefined) {
      throw new NoImageToRedeployError(app.appName);
    }
    return { appName: app.appName, imageName: app.imageName };
  }
}
