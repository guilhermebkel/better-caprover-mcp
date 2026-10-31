import { z } from "zod";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { AccessModeSchema } from "@/Schemas/AccessSchema.ts";

const OptionalTextSchema = z.string().optional().transform((text) => (text === undefined || text === "" ? undefined : text));

const DEFAULT_HTTP_HOST = "127.0.0.1";
const DEFAULT_HTTP_PORT = 3100;
const DEFAULT_MAX_HTTP_BODY_BYTES = 1_048_576;
const DEFAULT_MAX_HTTP_REQUESTS_PER_MINUTE = 120;
const DEFAULT_MAX_HTTP_SESSIONS = 64;
const DEFAULT_HTTP_SESSION_TTL_MS = 86_400_000;
const DEFAULT_MAX_CONCURRENT_PER_SERVER = 5;
const MIN_HTTP_TOKEN_LENGTH = 8;

const HttpTokenSchema: z.ZodType<string> = z.string().min(MIN_HTTP_TOKEN_LENGTH);

const parsePositiveIntFromEnv = (name: string, defaultValue: number): z.ZodType<number> => (
  z.string().optional().transform((text, context) => {
    if (text === undefined || text === "") {
      return defaultValue;
    }
    const parsed = Number.parseInt(text, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      context.addIssue({ code: "custom", message: `${name} must be a positive integer.` });
      return z.NEVER;
    }
    return parsed;
  })
);

const httpTokenFromEnv = z.string().optional().transform((text, context) => {
  if (text === undefined || text === "") {
    return undefined;
  }
  const result = HttpTokenSchema.safeParse(text);
  if (!result.success) {
    context.addIssue({ code: "custom", message: "CAPROVER_MCP_HTTP_TOKEN must be at least 8 characters." });
    return z.NEVER;
  }
  return result.data;
});

export type RawEnvValues = {
  CAPROVER_MCP_MODE: Env["CAPROVER_MCP_MODE"];
  CAPROVER_MCP_ALLOW_CRITICAL: boolean;
  CAPROVER_URL?: string;
  CAPROVER_PASSWORD?: string;
  CAPROVER_MCP_HTTP_HOST: string;
  CAPROVER_MCP_HTTP_PORT: number;
  CAPROVER_MCP_HTTP_TOKEN?: string;
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: number;
  CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: number;
  CAPROVER_MCP_MAX_HTTP_SESSIONS: number;
  CAPROVER_MCP_HTTP_SESSION_TTL_MS: number;
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
  CAPROVER_MCP_HTTP_PORT: parsePositiveIntFromEnv("CAPROVER_MCP_HTTP_PORT", DEFAULT_HTTP_PORT),
  CAPROVER_MCP_HTTP_TOKEN: httpTokenFromEnv,
  CAPROVER_MCP_MAX_HTTP_BODY_BYTES: parsePositiveIntFromEnv("CAPROVER_MCP_MAX_HTTP_BODY_BYTES", DEFAULT_MAX_HTTP_BODY_BYTES),
  CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE: parsePositiveIntFromEnv("CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE", DEFAULT_MAX_HTTP_REQUESTS_PER_MINUTE),
  CAPROVER_MCP_MAX_HTTP_SESSIONS: parsePositiveIntFromEnv("CAPROVER_MCP_MAX_HTTP_SESSIONS", DEFAULT_MAX_HTTP_SESSIONS),
  CAPROVER_MCP_HTTP_SESSION_TTL_MS: parsePositiveIntFromEnv("CAPROVER_MCP_HTTP_SESSION_TTL_MS", DEFAULT_HTTP_SESSION_TTL_MS),
  CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER: parsePositiveIntFromEnv("CAPROVER_MCP_MAX_CONCURRENT_PER_SERVER", DEFAULT_MAX_CONCURRENT_PER_SERVER),
  CAPROVER_MCP_SERVERS: OptionalTextSchema,
  CAPROVER_MCP_SERVERS_FILE: OptionalTextSchema,
});
