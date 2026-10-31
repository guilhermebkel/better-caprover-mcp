import { z } from "zod";
import type { Env, ResolvedCaproverServer } from "@/Protocols/EnvProtocol.ts";
import type { CaproverServerEntryConfig } from "@/Protocols/ServerRoutingProtocol.ts";
import { AccessModeSchema } from "@/Schemas/AccessSchema.ts";
import { DEFAULT_SERVER_NAME, HttpTokensSchema } from "@/Schemas/ServerConfigSchema.ts";

const OptionalTextSchema = z.string().optional().transform((text) => (text === undefined || text === "" ? undefined : text));

const DEFAULT_HTTP_HOST = "127.0.0.1";
const DEFAULT_HTTP_PORT = 3100;
const DEFAULT_MAX_HTTP_BODY_BYTES = 1_048_576;
const DEFAULT_MAX_CONCURRENT_PER_SERVER = 5;

const parsePositiveIntFromEnv = (defaultValue: number): z.ZodType<number> => z.string().optional().transform((text) => {
  if (text === undefined || text === "") {
    return defaultValue;
  }
  const parsed = Number.parseInt(text, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return defaultValue;
  }
  return parsed;
});

const httpTokensFromEnv = z.string().optional().transform((text, context) => {
  if (text === undefined || text === "") {
    return undefined;
  }
  try {
    return HttpTokensSchema.parse(JSON.parse(text));
  } catch {
    context.addIssue({ code: "custom", message: "CAPROVER_MCP_HTTP_TOKENS must be a JSON object of client names to secrets." });
    return z.NEVER;
  }
});

export type RawEnvValues = {
  CAPROVER_MCP_MODE: Env["CAPROVER_MCP_MODE"];
  CAPROVER_MCP_ALLOW_CRITICAL: boolean;
  CAPROVER_URL?: string;
  CAPROVER_PASSWORD?: string;
  CAPROVER_MCP_HTTP_HOST: string;
  CAPROVER_MCP_HTTP_PORT: number;
  CAPROVER_MCP_HTTP_TOKENS?: Env["CAPROVER_MCP_HTTP_TOKENS"];
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: number;
  CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER: number;
  CAPROVER_MCP_SERVERS?: string;
  CAPROVER_MCP_SERVERS_FILE?: string;
};

export const RawEnvSchema: z.ZodType<RawEnvValues> = z.object({
  CAPROVER_MCP_MODE: AccessModeSchema.default("readonly"),
  CAPROVER_MCP_ALLOW_CRITICAL: z.string().optional().transform((text) => text === "1"),
  CAPROVER_URL: OptionalTextSchema.pipe(
    z.url({ protocol: /^https?$/, error: "CAPROVER_URL must be a URL that starts with http:// or https://" })
      .transform((url) => new URL(url).origin)
      .optional(),
  ),
  CAPROVER_PASSWORD: OptionalTextSchema,
  CAPROVER_MCP_HTTP_HOST: z.string().optional().transform((text) => (text === undefined || text === "" ? DEFAULT_HTTP_HOST : text)),
  CAPROVER_MCP_HTTP_PORT: parsePositiveIntFromEnv(DEFAULT_HTTP_PORT),
  CAPROVER_MCP_HTTP_TOKENS: httpTokensFromEnv,
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: parsePositiveIntFromEnv(DEFAULT_MAX_HTTP_BODY_BYTES),
  CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER: parsePositiveIntFromEnv(DEFAULT_MAX_CONCURRENT_PER_SERVER),
  CAPROVER_MCP_SERVERS: OptionalTextSchema,
  CAPROVER_MCP_SERVERS_FILE: OptionalTextSchema,
});

export const buildLegacyServers = (
  mode: Env["CAPROVER_MCP_MODE"],
  isCriticalAllowed: boolean,
  url?: string,
  password?: string,
): ResolvedCaproverServer[] => [{
  name: DEFAULT_SERVER_NAME,
  url,
  password,
  mode,
  isCriticalAllowed,
}];

export const buildMultiServers = (
  entries: CaproverServerEntryConfig[],
  passwordReader: (entry: CaproverServerEntryConfig) => string,
): ResolvedCaproverServer[] => (
  entries.map((entry) => ({
    name: entry.name,
    url: entry.url,
    password: passwordReader(entry),
    mode: entry.mode,
    isCriticalAllowed: entry.isCriticalAllowed ?? false,
  }))
);
