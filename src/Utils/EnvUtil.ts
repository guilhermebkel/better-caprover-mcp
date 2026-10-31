import { InvalidEnvError } from "@/Errors/InvalidEnvError.ts";
import type { Env, ResolvedCaproverServer } from "@/Protocols/EnvProtocol.ts";
import type { CaproverServerEntryConfig } from "@/Protocols/ServerRoutingProtocol.ts";
import { CaproverServerEnvUtil } from "@/Utils/CaproverServerEnvUtil.ts";
import {
  RawEnvSchema,
  type RawEnvValues,
} from "@/Schemas/EnvSchema.ts";
import { CaproverServersFileSchema } from "@/Schemas/ServerConfigSchema.ts";
import { FileReadUtil } from "@/Utils/FileReadUtil.ts";
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
    const servers = EnvUtil.loadServers(raw);
    return {
      CAPROVER_MCP_MODE: raw.CAPROVER_MCP_MODE,
      CAPROVER_MCP_ALLOW_CRITICAL: raw.CAPROVER_MCP_ALLOW_CRITICAL,
      CAPROVER_URL: raw.CAPROVER_URL,
      CAPROVER_PASSWORD: raw.CAPROVER_PASSWORD,
      CAPROVER_MCP_HTTP_HOST: raw.CAPROVER_MCP_HTTP_HOST,
      CAPROVER_MCP_HTTP_PORT: raw.CAPROVER_MCP_HTTP_PORT,
      CAPROVER_MCP_HTTP_TOKENS: raw.CAPROVER_MCP_HTTP_TOKENS,
      CAPROVER_MCP_MAX_HTTP_BODY_BYTES: raw.CAPROVER_MCP_MAX_HTTP_BODY_BYTES,
      CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: raw.CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE,
      CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER: raw.CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER,
      servers,
    };
  }

  private static loadServers(raw: RawEnvValues): ResolvedCaproverServer[] {
    if (raw.CAPROVER_MCP_SERVERS !== undefined) {
      return EnvUtil.parseMultiServers(raw.CAPROVER_MCP_SERVERS);
    }
    if (raw.CAPROVER_MCP_SERVERS_FILE !== undefined) {
      return EnvUtil.parseMultiServers(FileReadUtil.readTrimmedText(raw.CAPROVER_MCP_SERVERS_FILE));
    }
    return CaproverServerEnvUtil.buildLegacyServers(
      raw.CAPROVER_MCP_MODE,
      raw.CAPROVER_MCP_ALLOW_CRITICAL,
      raw.CAPROVER_URL,
      raw.CAPROVER_PASSWORD,
    );
  }

  private static parseMultiServers(rawJson: string): ResolvedCaproverServer[] {
    const entries = CaproverServersFileSchema.parse(JSON.parse(rawJson) as unknown);
    return CaproverServerEnvUtil.buildMultiServers(entries, (entry) => EnvUtil.readPassword(entry));
  }

  private static readPassword(entry: CaproverServerEntryConfig): string {
    if (entry.passwordEnv !== undefined) {
      const value = process.env[entry.passwordEnv];
      if (value === undefined || value === "") {
        throw new InvalidEnvError(`Environment variable ${entry.passwordEnv} is not set for server "${entry.name}".`);
      }
      return value;
    }
    if (entry.passwordFile !== undefined) {
      return FileReadUtil.readTrimmedText(entry.passwordFile);
    }
    throw new InvalidEnvError(`Server "${entry.name}" has no password source.`);
  }
}
