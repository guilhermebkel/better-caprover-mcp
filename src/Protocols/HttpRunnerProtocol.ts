import type { IncomingMessage, ServerResponse } from "node:http";
import type { Env } from "@/Protocols/EnvProtocol.ts";

export type HttpRunnerStartOptions = {
  httpMarkerPath?: string;
  concurrencyQueueWaitMs?: number;
};

export type HttpServerHandle = {
  url: string;
  close: () => Promise<void>;
};

export type HttpRequestContext = {
  auth: { verifyRequest(request: IncomingMessage): boolean };
  failedAuthRateLimit: { assertAllowed(nowMs: number): void };
  authenticatedRateLimit: { assertAllowed(nowMs: number): void };
  sessions: {
    handleRequest(request: IncomingMessage, response: ServerResponse, parsedBody: unknown): Promise<void>;
    closeAll(): Promise<void>;
  };
  env: Env;
  getNowMs: () => number;
};
