import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CaproverClientAdapter } from "@/Adapters/CapRover/CaproverClientAdapter.ts";
import { ServerBuilder } from "@/Server/ServerBuilder.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";

export class StdioRunner {
  static async run(): Promise<void> {
    const env = EnvUtil.read();
    const server = ServerBuilder.build(env, CaproverClientAdapter.buildFromEnv(env), () => Date.now());
    await server.connect(new StdioServerTransport());
    LogUtil.logInfo("server_started");
  }
}
