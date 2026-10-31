import type { IncomingMessage } from "node:http";
import { TimingSafeCompareUtil } from "@/Utils/TimingSafeCompareUtil.ts";

const BEARER_PREFIX = /^Bearer\s+/i;

export class HttpAuthService {
  constructor(private readonly tokenSecrets: readonly string[]) {}

  verifyRequest(request: IncomingMessage): boolean {
    const header = request.headers.authorization;
    if (typeof header !== "string") {
      return false;
    }
    const match = BEARER_PREFIX.exec(header);
    if (match === null) {
      return false;
    }
    const token = header.slice(match[0].length).trim();
    if (token === "") {
      return false;
    }
    return TimingSafeCompareUtil.isAnySecretMatching(token, this.tokenSecrets);
  }

  static extractTokenSecrets(tokens: Record<string, string> | undefined): string[] {
    if (tokens === undefined) {
      return [];
    }
    return Object.values(tokens);
  }
}
