import { createServer, type Server } from "node:http";
import { HttpBindForbiddenError } from "@/Errors/HttpBindForbiddenError.ts";
import { HttpBadJsonError } from "@/Errors/HttpBadJsonError.ts";
import { HttpBodyTooLargeError } from "@/Errors/HttpBodyTooLargeError.ts";
import { HttpRateLimitError } from "@/Errors/HttpRateLimitError.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { HttpAuthService } from "@/Services/HttpAuthService.ts";
import { HttpMcpSessionService } from "@/Services/HttpMcpSessionService.ts";
import { McpApplicationService } from "@/Server/McpApplicationService.ts";
import { HttpRateLimitService } from "@/Services/HttpRateLimitService.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";
import { HttpBodyUtil } from "@/Utils/HttpBodyUtil.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";
import { NetworkBindUtil } from "@/Utils/NetworkBindUtil.ts";

const HEALTH_PATH = "/health";
const MCP_PATH = "/mcp";
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_INTERNAL_ERROR = 500;
const PLAIN_TEXT = "text/plain";

type HttpRequestContext = {
  auth: HttpAuthService;
  rateLimit: HttpRateLimitService;
  sessions: HttpMcpSessionService;
  env: Env;
  getNowMs: () => number;
};

export type HttpServerHandle = {
  url: string;
  close: () => Promise<void>;
};

export class HttpRunner {
  static async run(): Promise<void> {
    await HttpRunner.start();
    await new Promise<void>(() => {
      // Why: HTTP mode runs until the process is stopped.
    });
  }

  static async start(env: Env = EnvUtil.read()): Promise<HttpServerHandle> {
    HttpRunner.assertBindAllowed(env);
    const getNowMs = (): number => Date.now();
    const application = McpApplicationService.buildFromEnv(env, getNowMs);
    const auth = new HttpAuthService(HttpAuthService.extractTokenSecrets(env.CAPROVER_MCP_HTTP_TOKENS));
    const rateLimit = new HttpRateLimitService(env.CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE);
    const sessions = new HttpMcpSessionService(() => application.buildMcpServer(), getNowMs);
    const context: HttpRequestContext = { auth, rateLimit, sessions, env, getNowMs };
    const httpServer = createServer((request, response) => {
      void HttpRunner.handleHttpRequest(request, response, context).catch((error: unknown) => {
        LogUtil.logError("http_request_failed", error instanceof Error ? error.name : "unknown");
        if (!response.headersSent) {
          response.writeHead(HTTP_INTERNAL_ERROR, { "Content-Type": PLAIN_TEXT });
          response.end("Internal Server Error");
        }
      });
    });
    const port = await HttpRunner.bindHttpServer(httpServer, env.CAPROVER_MCP_HTTP_HOST, env.CAPROVER_MCP_HTTP_PORT);
    LogUtil.logInfo("http_server_started");
    return {
      url: `http://${env.CAPROVER_MCP_HTTP_HOST}:${port}`,
      close: async () => {
        await new Promise<void>((resolve, reject) => {
          httpServer.close((error) => {
            if (error === undefined) {
              resolve();
            } else {
              reject(error);
            }
          });
        });
        await sessions.closeAll();
      },
    };
  }

  static assertBindAllowed(env: Env): void {
    const isLocal = NetworkBindUtil.isLocalBindHost(env.CAPROVER_MCP_HTTP_HOST);
    const hasTokens = env.CAPROVER_MCP_HTTP_TOKENS !== undefined
      && Object.keys(env.CAPROVER_MCP_HTTP_TOKENS).length > 0;
    if (!isLocal && !hasTokens) {
      throw new HttpBindForbiddenError();
    }
  }

  private static bindHttpServer(httpServer: Server, host: string, port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(port, host, () => {
        const address = httpServer.address();
        if (address === null || typeof address === "string") {
          reject(new Error("HTTP server did not bind to a port."));
          return;
        }
        resolve(address.port);
      });
    });
  }

  private static async handleHttpRequest(
    request: import("node:http").IncomingMessage,
    response: import("node:http").ServerResponse,
    context: HttpRequestContext,
  ): Promise<void> {
    const { auth, rateLimit, sessions, env } = context;
    const url = request.url ?? "";
    if (request.method === "GET" && url.startsWith(HEALTH_PATH)) {
      response.writeHead(HTTP_OK, { "Content-Type": PLAIN_TEXT });
      response.end("ok");
      return;
    }
    if (!url.startsWith(MCP_PATH)) {
      response.writeHead(HTTP_NOT_FOUND, { "Content-Type": PLAIN_TEXT });
      response.end("Not Found");
      return;
    }
    try {
      const clientKey = HttpRunner.buildRateLimitKey(request);
      rateLimit.assertAllowed(clientKey, context.getNowMs());
      if (!auth.verifyRequest(request)) {
        response.writeHead(HTTP_UNAUTHORIZED, { "Content-Type": PLAIN_TEXT });
        response.end("Unauthorized");
        return;
      }
      const tokenKey = auth.resolveTokenKey(request);
      if (tokenKey === undefined) {
        response.writeHead(HTTP_UNAUTHORIZED, { "Content-Type": PLAIN_TEXT });
        response.end("Unauthorized");
        return;
      }
      const parsedBody = await HttpRunner.readParsedBody(request, env);
      await sessions.handleRequest(request, response, parsedBody, tokenKey);
    } catch (error) {
      if (error instanceof HttpBodyTooLargeError) {
        response.writeHead(HTTP_PAYLOAD_TOO_LARGE, { "Content-Type": PLAIN_TEXT });
        response.end("Payload Too Large");
        return;
      }
      if (error instanceof HttpBadJsonError) {
        response.writeHead(HTTP_BAD_REQUEST, { "Content-Type": PLAIN_TEXT });
        response.end("Bad Request");
        return;
      }
      if (error instanceof HttpRateLimitError) {
        response.writeHead(HTTP_TOO_MANY_REQUESTS, { "Content-Type": PLAIN_TEXT });
        response.end("Too Many Requests");
        return;
      }
      throw error;
    }
  }

  private static buildRateLimitKey(request: import("node:http").IncomingMessage): string {
    const header = request.headers.authorization;
    if (typeof header !== "string") {
      return "anonymous";
    }
    return header;
  }

  private static readParsedBody(request: import("node:http").IncomingMessage, env: Env): Promise<unknown> {
    if (request.method !== "POST") {
      return Promise.resolve(undefined);
    }
    return HttpBodyUtil.readJson(request, env.CAPROVER_MCP_MAX_HTTP_BODY_BYTES);
  }
}
