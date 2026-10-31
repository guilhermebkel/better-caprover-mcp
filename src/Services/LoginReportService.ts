import { CaproverClientAdapter } from "@/Adapters/CapRover/CaproverClientAdapter.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";

export class LoginReportService {
  constructor(
    private readonly client: CaproverClientPort,
    private readonly isConfigured: boolean,
  ) {}

  static buildFromEnv(env: Env): LoginReportService {
    const isConfigured = env.CAPROVER_URL !== undefined && env.CAPROVER_PASSWORD !== undefined;
    return new LoginReportService(CaproverClientAdapter.buildFromEnv(env), isConfigured);
  }

  async build(): Promise<string> {
    if (!this.isConfigured) {
      return "CAPROVER_URL and CAPROVER_PASSWORD are not set, so the login was not tested. "
        + "Set both and run this command again to test them.";
    }
    try {
      const info = await this.client.getSystemInfo();
      const { apps } = await this.client.listApps();
      return `Login worked: CapRover ${info.currentVersion} at ${info.rootDomain}, ${apps.length} apps.`;
    } catch (error) {
      return `Login failed: ${error instanceof Error ? error.message : "unknown error"}`;
    }
  }
}
