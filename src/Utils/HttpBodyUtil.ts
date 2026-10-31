import type { IncomingMessage } from "node:http";
import { HttpBadJsonError } from "@/Errors/HttpBadJsonError.ts";
import { HttpBodyTooLargeError } from "@/Errors/HttpBodyTooLargeError.ts";

export class HttpBodyUtil {
  static async readJson(request: IncomingMessage, maxBytes: number): Promise<unknown> {
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      total += buffer.length;
      if (total > maxBytes) {
        throw new HttpBodyTooLargeError(maxBytes);
      }
      chunks.push(buffer);
    }
    const text = Buffer.concat(chunks).toString("utf8").trim();
    if (text === "") {
      return undefined;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new HttpBadJsonError();
    }
  }
}
