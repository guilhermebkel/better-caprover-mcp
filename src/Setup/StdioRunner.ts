import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ServerSurface } from "@/Surfaces/ServerSurface.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";

export class StdioRunner {
  static async run(): Promise<void> {
    const env = EnvUtil.read();
    const server = ServerSurface.build(env, () => Date.now());
    await server.connect(new StdioServerTransport());
    LogUtil.logInfo("server_started");
  }
}
