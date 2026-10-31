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
  askPerson?: AskPerson;
};

export type PersonAnswer = "accepted" | "declined" | "unavailable";

export type AskPerson = (message: string) => Promise<PersonAnswer>;
