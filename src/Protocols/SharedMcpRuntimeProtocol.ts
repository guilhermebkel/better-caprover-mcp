import type { PolicyServicePort } from "@/Protocols/AccessProtocol.ts";
import type {
  ConfirmationServicePort,
  ConcurrencyLimiterServicePort,
} from "@/Protocols/ServicePortProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";

export type CaproverClientFactory = (env: Env) => CaproverClientPort;

export type SharedRuntimeParts = {
  client: CaproverClientPort;
  policy: PolicyServicePort;
  secrets: readonly string[];
  confirmation: ConfirmationServicePort;
  limiter: ConcurrencyLimiterServicePort;
  getNowMs: () => number;
};
