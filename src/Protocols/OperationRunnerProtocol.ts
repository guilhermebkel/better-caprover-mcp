import type { PolicyServicePort } from "@/Protocols/AccessProtocol.ts";
import type {
  ConfirmationServicePort,
  ConcurrencyLimiterServicePort,
} from "@/Protocols/ServicePortProtocol.ts";

export type OperationRunnerDeps = {
  policy: PolicyServicePort;
  secrets: readonly string[];
  confirmation: ConfirmationServicePort;
  limiter: ConcurrencyLimiterServicePort;
  getNowMs: () => number;
};
