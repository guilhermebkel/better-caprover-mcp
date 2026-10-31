import { AppNotFoundError } from "@/Errors/AppNotFoundError.ts";
import type { CaproverApp, CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import { ClosestNameUtil } from "@/Utils/ClosestNameUtil.ts";

export class AppResolverService {
  static readonly CLOSEST_NAMES_COUNT = 5;

  constructor(private readonly client: CaproverClientPort) {}

  async getApp(appName: string): Promise<CaproverApp> {
    const { apps } = await this.client.listApps();
    return AppResolverService.pickApp(apps, appName);
  }

  async getApps(appNames: readonly string[]): Promise<CaproverApp[]> {
    const { apps } = await this.client.listApps();
    return appNames.map((appName) => AppResolverService.pickApp(apps, appName));
  }

  private static pickApp(apps: readonly CaproverApp[], appName: string): CaproverApp {
    const found = apps.find((app) => app.appName === appName);
    if (found !== undefined) {
      return found;
    }
    const names = apps.map((app) => app.appName);
    throw new AppNotFoundError(appName, ClosestNameUtil.find(appName, names, AppResolverService.CLOSEST_NAMES_COUNT));
  }
}
