import type { PolicyServicePort } from "@/Protocols/AccessProtocol.ts";
import type {
  AuditLogServicePort,
  ConfirmationServicePort,
  ConcurrencyLimiterServicePort,
} from "@/Protocols/ServicePortProtocol.ts";

export type OperationRunnerDeps = {
  policy: PolicyServicePort;
  secrets: readonly string[];
  confirmation: ConfirmationServicePort;
  audit: AuditLogServicePort;
  limiter: ConcurrencyLimiterServicePort;
  getNowMs: () => number;
};
