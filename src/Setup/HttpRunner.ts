import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { ConnectableMcpServer } from "@/Protocols/HttpSessionRunnerProtocol.ts";
import type {
  HttpRequestContext,
  HttpRunnerStartOptions,
  HttpServerHandle,
} from "@/Protocols/HttpRunnerProtocol.ts";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { HttpBindForbiddenError } from "@/Errors/HttpBindForbiddenError.ts";
import { HttpBadJsonError } from "@/Errors/HttpBadJsonError.ts";
import { HttpBodyTooLargeError } from "@/Errors/HttpBodyTooLargeError.ts";
import { HttpRateLimitError } from "@/Errors/HttpRateLimitError.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { HttpAuthService } from "@/Services/HttpAuthService.ts";
import { HttpRateLimitService } from "@/Services/HttpRateLimitService.ts";
import { HttpModeMarkerUtil } from "@/Utils/HttpModeMarkerUtil.ts";
import { HttpSessionRunner } from "@/Setup/HttpSessionRunner.ts";
import { SharedMcpRuntimeSurface } from "@/Surfaces/SharedMcpRuntimeSurface.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";
import { HttpBodyUtil } from "@/Utils/HttpBodyUtil.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";
import { NetworkBindUtil } from "@/Utils/NetworkBindUtil.ts";
import { StartupLogUtil } from "@/Utils/StartupLogUtil.ts";

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

export class HttpRunner {
  static async run(): Promise<void> {
    const handle = await HttpRunner.start();
    await new Promise<void>((resolve) => {
      const stop = (): void => {
        handle.close().then(resolve, (error: unknown) => {
          LogUtil.logError("http_close_failed", error instanceof Error ? error.name : "unknown");
          resolve();
        });
      };
      process.once("SIGTERM", stop);
      process.once("SIGINT", stop);
    });
  }

  static async start(env: Env = EnvUtil.read(), options: HttpRunnerStartOptions = {}): Promise<HttpServerHandle> {
    StartupLogUtil.startLogging(env, "http");
    HttpRunner.assertBindAllowed(env);
    const getNowMs = (): number => Date.now();
    const runtime = SharedMcpRuntimeSurface.buildFromEnv(
      env,
      getNowMs,
      undefined,
      options.concurrencyQueueWaitMs,
    );
    const auth = new HttpAuthService(env.CAPROVER_MCP_HTTP_TOKEN);
    const failedAuthRateLimit = new HttpRateLimitService(env.CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE);
    const authenticatedRateLimit = new HttpRateLimitService(env.CAPROVER_MCP_MAX_HTTP_REQUESTS_PER_MINUTE);
    const sessions = new HttpSessionRunner(
      (): ConnectableMcpServer => {
        const server = runtime.buildMcpServer();
        return {
          connect: async (transport) => {
            await server.connect(transport as StreamableHTTPServerTransport);
          },
        };
      },
      getNowMs,
      env.CAPROVER_MCP_MAX_HTTP_SESSIONS,
      env.CAPROVER_MCP_HTTP_SESSION_TTL_MS,
    );
    const context: HttpRequestContext = {
      auth,
      authenticatedRateLimit,
      env,
      failedAuthRateLimit,
      getNowMs,
      sessions,
    };
    const httpServer = createServer((request, response) => {
      void HttpRunner.handleHttpRequest(request, response, context).catch((error: unknown) => {
        LogUtil.logError("http_request_failed", error instanceof Error ? error.name : "unknown");
        if (!response.headersSent) {
          response.writeHead(HTTP_INTERNAL_ERROR, { "Content-Type": PLAIN_TEXT });
          response.end("Internal Server Error");
        }
      });
    });
    const markerPath = options.httpMarkerPath ?? HttpModeMarkerUtil.DEFAULT_MARKER_PATH;
    const port = await HttpRunner.bindHttpServer(httpServer, env.CAPROVER_MCP_HTTP_HOST, env.CAPROVER_MCP_HTTP_PORT);
    HttpModeMarkerUtil.markHttpModeActive(markerPath);
    StartupLogUtil.logServerStarted(env, "http");
    return {
      url: `http://${NetworkBindUtil.buildUrlHost(env.CAPROVER_MCP_HTTP_HOST)}:${port}`,
      close: async () => {
        HttpModeMarkerUtil.clearHttpModeMarker(markerPath);
        await sessions.closeAll();
        const closed = new Promise<void>((resolve, reject) => {
          httpServer.close((error) => {
            if (error === undefined) {
              resolve();
            } else {
              reject(error);
            }
          });
        });
        httpServer.closeAllConnections();
        await closed;
      },
    };
  }

  static assertBindAllowed(env: Env): void {
    const isLocal = NetworkBindUtil.isLocalBindHost(env.CAPROVER_MCP_HTTP_HOST);
    const hasToken = env.CAPROVER_MCP_HTTP_TOKEN !== undefined;
    if (!isLocal && !hasToken) {
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
    request: IncomingMessage,
    response: ServerResponse,
    context: HttpRequestContext,
  ): Promise<void> {
    const { auth, authenticatedRateLimit, failedAuthRateLimit, sessions, env } = context;
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "GET" && pathname === HEALTH_PATH) {
      response.writeHead(HTTP_OK, { "Content-Type": PLAIN_TEXT });
      response.end("ok");
      return;
    }
    if (pathname !== MCP_PATH) {
      response.writeHead(HTTP_NOT_FOUND, { "Content-Type": PLAIN_TEXT });
      response.end("Not Found");
      return;
    }
    try {
      if (!auth.verifyRequest(request)) {
        failedAuthRateLimit.assertAllowed(context.getNowMs());
        response.writeHead(HTTP_UNAUTHORIZED, { "Content-Type": PLAIN_TEXT });
        response.end("Unauthorized");
        return;
      }
      authenticatedRateLimit.assertAllowed(context.getNowMs());
      const parsedBody = await HttpRunner.readParsedBody(request, env);
      await sessions.handleRequest(request, response, parsedBody);
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

  private static readParsedBody(request: IncomingMessage, env: Env): Promise<unknown> {
    if (request.method !== "POST") {
      return Promise.resolve(undefined);
    }
    return HttpBodyUtil.readJson(request, env.CAPROVER_MCP_MAX_HTTP_BODY_BYTES);
  }
}
