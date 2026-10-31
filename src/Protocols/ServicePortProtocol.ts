import type { AuditRecord } from "@/Protocols/AuditLogProtocol.ts";

export interface AuditLogServicePort { write(record: AuditRecord): void }

export interface ConfirmationServicePort {
  createToken(fingerprint: string): string;
  consumeToken(token: string, fingerprint: string): boolean;
}

export interface ConcurrencyLimiterServicePort { run<T>(task: () => Promise<T>): Promise<T> }
