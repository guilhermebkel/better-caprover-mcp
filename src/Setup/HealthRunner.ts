import { UnhealthyError } from "@/Errors/UnhealthyError.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";
import { HttpModeMarkerUtil } from "@/Utils/HttpModeMarkerUtil.ts";
import { NetworkBindUtil } from "@/Utils/NetworkBindUtil.ts";

const PROBE_TIMEOUT_MS = 2000;

export class HealthRunner {
  static async run(): Promise<void> {
    const isHealthy = await HealthRunner.check(EnvUtil.read(), HttpModeMarkerUtil.DEFAULT_MARKER_PATH);
    if (!isHealthy) {
      throw new UnhealthyError();
    }
  }

  static async check(env: Env, markerPath: string): Promise<boolean> {
    if (!HttpModeMarkerUtil.isHttpModeActive(markerPath)) {
      return true;
    }
    const host = NetworkBindUtil.buildProbeHost(env.CAPROVER_MCP_HTTP_HOST);
    try {
      const response = await fetch(`http://${host}:${env.CAPROVER_MCP_HTTP_PORT}/health`, {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      return response.ok && (await response.text()) === "ok";
    } catch {
      return false;
    }
  }
}
