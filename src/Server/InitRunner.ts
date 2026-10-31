import { CaproverClientAdapter } from "@/Adapters/CapRover/CaproverClientAdapter.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";

const JSON_INDENT = 2;

const NPX_CONFIG = {
  mcpServers: {
    caprover: {
      command: "npx",
      args: ["-y", "better-caprover-mcp"],
      env: { CAPROVER_URL: "https://captain.your-domain.com", CAPROVER_PASSWORD: "<your CapRover password>" },
    },
  },
};

const DOCKER_CONFIG = {
  mcpServers: {
    caprover: {
      command: "docker",
      args: ["run", "-i", "--rm", "-e", "CAPROVER_URL", "-e", "CAPROVER_PASSWORD", "ghcr.io/guilhermebkel/better-caprover-mcp"],
      env: { CAPROVER_URL: "https://captain.your-domain.com", CAPROVER_PASSWORD: "<your CapRover password>" },
    },
  },
};

export class InitRunner {
  static async run(): Promise<void> {
    const env = EnvUtil.read();
    LogUtil.showMessage(await InitRunner.buildLoginReport(env));
    LogUtil.showMessage(`Config for an MCP client that runs the server with npx:\n${JSON.stringify(NPX_CONFIG, undefined, JSON_INDENT)}`);
    LogUtil.showMessage(`Config for an MCP client that runs the server with Docker:\n${JSON.stringify(DOCKER_CONFIG, undefined, JSON_INDENT)}`);
    LogUtil.showMessage(
      "The server starts in readonly mode. Add CAPROVER_MCP_MODE=operate to let it change apps, "
      + "or admin to let it also delete them.",
    );
  }

  private static async buildLoginReport(env: ReturnType<typeof EnvUtil.read>): Promise<string> {
    if (env.CAPROVER_URL === undefined || env.CAPROVER_PASSWORD === undefined) {
      return "CAPROVER_URL and CAPROVER_PASSWORD are not set, so the login was not tested. "
        + "Set both and run this command again to test them.";
    }
    try {
      const client = CaproverClientAdapter.buildFromEnv(env);
      const info = await client.getSystemInfo();
      const { apps } = await client.listApps();
      return `Login worked: CapRover ${info.currentVersion} at ${info.rootDomain}, ${apps.length} apps.`;
    } catch (error) {
      return `Login failed: ${error instanceof Error ? error.message : "unknown error"}`;
    }
  }
}
