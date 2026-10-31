import type { Env } from "@/Protocols/EnvProtocol.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";

export class StartupLogUtil {
  static startLogging(env: Env, transport: Env["CAPROVER_MCP_TRANSPORT"]): void {
    // Why: sets the level before anything else logs, so the chosen level applies from the first line.
    LogUtil.setLevel(env.CAPROVER_MCP_LOG_LEVEL);
    LogUtil.logDebug("config_loaded", {
      transport,
      logLevel: env.CAPROVER_MCP_LOG_LEVEL,
      capRoverOrigin: env.CAPROVER_URL ?? "unset",
      capRoverPasswordSet: env.CAPROVER_PASSWORD !== undefined,
      httpHost: env.CAPROVER_MCP_HTTP_HOST,
      httpPort: env.CAPROVER_MCP_HTTP_PORT,
      httpTokenSet: env.CAPROVER_MCP_HTTP_TOKEN !== undefined,
      maxConcurrent: env.CAPROVER_MCP_MAX_CONCURRENT,
    });
  }

  static logServerStarted(env: Env, transport: Env["CAPROVER_MCP_TRANSPORT"]): void {
    LogUtil.logInfo("server_started", {
      transport,
      mode: env.CAPROVER_MCP_MODE,
      allowCritical: env.CAPROVER_MCP_ALLOW_CRITICAL,
      capRoverUrlSet: env.CAPROVER_URL !== undefined,
      capRoverPasswordSet: env.CAPROVER_PASSWORD !== undefined,
    });
  }
}
