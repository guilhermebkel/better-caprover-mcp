import { AppNotFoundError } from "@/Errors/AppNotFoundError.ts";
import type { CaproverApp, CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import { ClosestNameUtil } from "@/Utils/ClosestNameUtil.ts";

export class AppResolverService {
  static readonly CLOSEST_NAMES_COUNT = 5;

  constructor(private readonly client: CaproverClientPort) {}

  async getApp(appName: string): Promise<CaproverApp> {
    const { apps } = await this.client.listApps();
    const found = apps.find((app) => app.appName === appName);
    if (found !== undefined) {
      return found;
    }
    const names = apps.map((app) => app.appName);
    throw new AppNotFoundError(appName, ClosestNameUtil.find(appName, names, AppResolverService.CLOSEST_NAMES_COUNT));
  }
}
