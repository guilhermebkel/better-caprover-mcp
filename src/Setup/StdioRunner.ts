import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ServerSurface } from "@/Surfaces/ServerSurface.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";
import { StartupLogUtil } from "@/Utils/StartupLogUtil.ts";

export class StdioRunner {
  static async run(): Promise<void> {
    const env = EnvUtil.read();
    StartupLogUtil.startLogging(env, "stdio");
    const server = ServerSurface.build(env, () => Date.now());
    await server.connect(new StdioServerTransport());
    StartupLogUtil.logServerStarted(env, "stdio");
  }
}
