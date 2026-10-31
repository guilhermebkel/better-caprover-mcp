import { LoginReportService } from "@/Services/LoginReportService.ts";
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
    LogUtil.showMessage(await LoginReportService.buildFromEnv(env).build());
    LogUtil.showMessage(`Config for an MCP client that runs the server with npx:\n${JSON.stringify(NPX_CONFIG, undefined, JSON_INDENT)}`);
    LogUtil.showMessage(`Config for an MCP client that runs the server with Docker:\n${JSON.stringify(DOCKER_CONFIG, undefined, JSON_INDENT)}`);
    LogUtil.showMessage(
      "The server starts in readonly mode. Add CAPROVER_MCP_MODE=operate to let it change apps, "
      + "or admin to let it also delete them.",
    );
  }
}
