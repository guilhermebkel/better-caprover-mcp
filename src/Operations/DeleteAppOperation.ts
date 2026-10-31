import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { DeleteAppInput } from "@/Protocols/AppInputProtocol.ts";
import type { CaproverApp, CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { OperationPort, OperationResult } from "@/Protocols/OperationProtocol.ts";
import { DeleteAppInputSchema } from "@/Schemas/AppInputSchema.ts";
import type { AppResolverService } from "@/Services/AppResolverService.ts";

export class DeleteAppOperation implements OperationPort<DeleteAppInput> {
  static readonly NAME = "deleteApp";

  readonly description = "Deletes one app and its containers, and its volumes only if `delete_volumes` is true. "
    + "Run it only when the person asked to delete this app, never to tidy up. A deleted app and deleted volumes "
    + "cannot be restored. Without `user_confirmed` it deletes nothing and returns a preview with a `confirmation_token`. "
    + "To stop an app without losing it, use `scale_app` with 0.";

  readonly inputSchema = DeleteAppInputSchema;

  readonly risk: RiskTier = "destructive";

  constructor(
    private readonly client: CaproverClientPort,
    private readonly resolver: AppResolverService,
  ) {}

  async describeChange(input: DeleteAppInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const volumeNames = DeleteAppOperation.pickVolumeNames(app, input);
    return {
      summary: `Would delete the app ${app.appName} (${app.instanceCount} instances, image ${app.imageName ?? "none"}, `
        + `${app.customDomains.length} custom domains) and ${volumeNames.length} volumes. This cannot be undone.`,
      data: {
        appName: app.appName,
        instanceCount: app.instanceCount,
        imageName: app.imageName,
        customDomains: app.customDomains.map((customDomain) => customDomain.publicDomain),
        volumesToDelete: volumeNames,
        volumesKept: DeleteAppOperation.listNamedVolumes(app).filter((name) => !volumeNames.includes(name)),
      },
    };
  }

  async execute(input: DeleteAppInput): Promise<OperationResult> {
    const app = await this.resolver.getApp(input.app_name);
    const volumeNames = DeleteAppOperation.pickVolumeNames(app, input);
    await this.client.deleteApp(app.appName, volumeNames);
    return {
      summary: `Deleted the app ${app.appName} and ${volumeNames.length} volumes.`,
      data: { appName: app.appName, deletedVolumes: volumeNames },
    };
  }

  private static pickVolumeNames(app: CaproverApp, input: DeleteAppInput): string[] {
    if (input.delete_volumes !== true) {
      return [];
    }
    return DeleteAppOperation.listNamedVolumes(app);
  }

  private static listNamedVolumes(app: CaproverApp): string[] {
    return app.volumes.flatMap((volume) => (volume.volumeName === undefined ? [] : [volume.volumeName]));
  }
}
