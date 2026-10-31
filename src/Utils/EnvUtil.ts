import { InvalidEnvError } from "@/Errors/InvalidEnvError.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import {
  RawEnvSchema,
  type RawEnvValues,
} from "@/Schemas/EnvSchema.ts";
import { z } from "zod";

export class EnvUtil {
  static read(): Env {
    const result = RawEnvSchema.safeParse(process.env);
    if (!result.success) {
      throw new InvalidEnvError(z.prettifyError(result.error));
    }
    return EnvUtil.buildEnv(result.data);
  }

  private static buildEnv(raw: RawEnvValues): Env {
    return {
      CAPROVER_MCP_MODE: raw.CAPROVER_MCP_MODE,
      CAPROVER_MCP_ALLOW_CRITICAL: raw.CAPROVER_MCP_ALLOW_CRITICAL,
      CAPROVER_MCP_TOOLSETS: raw.CAPROVER_MCP_TOOLSETS,
      CAPROVER_URL: raw.CAPROVER_URL,
      CAPROVER_PASSWORD: raw.CAPROVER_PASSWORD,
      CAPROVER_MCP_HTTP_HOST: raw.CAPROVER_MCP_HTTP_HOST,
      CAPROVER_MCP_HTTP_PORT: raw.CAPROVER_MCP_HTTP_PORT,
      CAPROVER_MCP_HTTP_TOKEN: raw.CAPROVER_MCP_HTTP_TOKEN,
      CAPROVER_MCP_MAX_HTTP_BODY_BYTES: raw.CAPROVER_MCP_MAX_HTTP_BODY_BYTES,
      CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: raw.CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE,
      CAPROVER_MCP_MAX_HTTP_SESSIONS: raw.CAPROVER_MCP_MAX_HTTP_SESSIONS,
      CAPROVER_MCP_HTTP_SESSION_TTL_MS: raw.CAPROVER_MCP_HTTP_SESSION_TTL_MS,
      CAPROVER_MCP_MAX_CONCURRENT: raw.CAPROVER_MCP_MAX_CONCURRENT,
    };
  }
}
