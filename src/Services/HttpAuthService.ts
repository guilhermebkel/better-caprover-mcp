import type { IncomingMessage } from "node:http";
import { TimingSafeCompareUtil } from "@/Utils/TimingSafeCompareUtil.ts";

const BEARER_PREFIX = /^Bearer\s+/i;

export class HttpAuthService {
  constructor(private readonly expectedToken: string | undefined) {}

  verifyRequest(request: IncomingMessage): boolean {
    const token = HttpAuthService.readBearerToken(request);
    if (token === undefined || this.expectedToken === undefined) {
      return false;
    }
    return TimingSafeCompareUtil.isSecretMatching(token, this.expectedToken);
  }

  private static readBearerToken(request: IncomingMessage): string | undefined {
    const header = request.headers.authorization;
    if (typeof header !== "string") {
      return undefined;
    }
    const match = BEARER_PREFIX.exec(header);
    if (match === null) {
      return undefined;
    }
    const token = header.slice(match[0].length).trim();
    return token === "" ? undefined : token;
  }
}
