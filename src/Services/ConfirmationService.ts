import { randomBytes } from "node:crypto";
import type { PendingConfirmation } from "@/Protocols/ConfirmationProtocol.ts";

export class ConfirmationService {
  static readonly TOKEN_TTL_MS = 300_000;

  private static readonly TOKEN_BYTES = 16;

  private readonly tokenToPending = new Map<string, PendingConfirmation>();

  constructor(private readonly getNowMs: () => number) {}

  createToken(fingerprint: string): string {
    this.dropExpired();
    const token = randomBytes(ConfirmationService.TOKEN_BYTES).toString("hex");
    this.tokenToPending.set(token, { fingerprint, expiresAtMs: this.getNowMs() + ConfirmationService.TOKEN_TTL_MS });
    return token;
  }

  consumeToken(token: string, fingerprint: string): boolean {
    const pending = this.tokenToPending.get(token);
    if (pending === undefined) {
      return false;
    }
    const isValid = pending.fingerprint === fingerprint && pending.expiresAtMs > this.getNowMs();
    if (isValid) {
      this.tokenToPending.delete(token);
    }
    return isValid;
  }

  private dropExpired(): void {
    const nowMs = this.getNowMs();
    for (const [token, pending] of this.tokenToPending) {
      if (pending.expiresAtMs <= nowMs) {
        this.tokenToPending.delete(token);
      }
    }
  }
}
