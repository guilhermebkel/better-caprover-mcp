import type { IncomingMessage } from "node:http";
import { TimingSafeCompareUtil } from "@/Utils/TimingSafeCompareUtil.ts";

const BEARER_PREFIX = /^Bearer\s+/i;

export class HttpAuthService {
  constructor(private readonly tokenSecrets: readonly string[]) {}

  verifyRequest(request: IncomingMessage): boolean {
    return this.resolveTokenKey(request) !== undefined;
  }

  resolveTokenKey(request: IncomingMessage): string | undefined {
    const header = request.headers.authorization;
    if (typeof header !== "string") {
      return undefined;
    }
    const match = BEARER_PREFIX.exec(header);
    if (match === null) {
      return undefined;
    }
    const token = header.slice(match[0].length).trim();
    if (token === "") {
      return undefined;
    }
    if (!TimingSafeCompareUtil.isAnySecretMatching(token, this.tokenSecrets)) {
      return undefined;
    }
    return header;
  }

  static extractTokenSecrets(tokens: Record<string, string> | undefined): string[] {
    if (tokens === undefined) {
      return [];
    }
    return Object.values(tokens);
  }
}
