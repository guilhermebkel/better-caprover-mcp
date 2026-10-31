import { z } from "zod";
import type { CaproverServerEntryConfig } from "@/Protocols/ServerRoutingProtocol.ts";
import { AccessModeSchema } from "@/Schemas/AccessSchema.ts";

export const DEFAULT_SERVER_NAME = "default";

const MAX_SERVER_NAME_LENGTH = 64;
const MAX_PASSWORD_ENV_LENGTH = 128;
const MAX_PASSWORD_FILE_LENGTH = 4096;
const MIN_HTTP_TOKEN_LENGTH = 8;

export const ServerNameSchema = z.string().min(1).max(MAX_SERVER_NAME_LENGTH).regex(
  /^[a-z][a-z0-9-]*$/,
  "Server name must start with a lowercase letter and contain only lowercase letters, digits and dashes.",
);

export const CaproverServerEntrySchema: z.ZodType<CaproverServerEntryConfig> = z.object({
  name: ServerNameSchema,
  url: z.url({ protocol: /^https?$/ }).transform((url) => new URL(url).origin),
  mode: AccessModeSchema,
  isCriticalAllowed: z.boolean().optional(),
  passwordEnv: z.string().min(1).max(MAX_PASSWORD_ENV_LENGTH).optional(),
  passwordFile: z.string().min(1).max(MAX_PASSWORD_FILE_LENGTH).optional(),
}).strict().superRefine((entry, context) => {
  const hasEnv = entry.passwordEnv !== undefined;
  const hasFile = entry.passwordFile !== undefined;
  if (hasEnv === hasFile) {
    context.addIssue({
      code: "custom",
      message: "Each server needs exactly one of `passwordEnv` or `passwordFile`.",
      path: ["passwordEnv"],
    });
  }
});

export const CaproverServersFileSchema = z.union([
  z.array(CaproverServerEntrySchema),
  z.object({ servers: z.array(CaproverServerEntrySchema).min(1) }).transform((value) => value.servers),
]);

export const HttpTokensSchema = z.record(z.string().min(1), z.string().min(MIN_HTTP_TOKEN_LENGTH)).refine(
  (tokens) => Object.keys(tokens).length > 0,
  "CAPROVER_MCP_HTTP_TOKENS must name at least one client token.",
);

export const ServerToolInputSchema = z.object({
  server: z.string().min(1).max(MAX_SERVER_NAME_LENGTH).optional().describe(
    "Which configured CapRover server to use. Required when several servers are configured; omit when there is only one.",
  ),
});
