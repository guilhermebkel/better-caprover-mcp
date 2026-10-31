import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { HttpBindForbiddenError } from "@/Errors/HttpBindForbiddenError.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { ServerBuilder } from "@/Server/ServerBuilder.ts";
import { HttpAuthService } from "@/Services/HttpAuthService.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";
import { HttpBodyUtil } from "@/Utils/HttpBodyUtil.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";
import { NetworkBindUtil } from "@/Utils/NetworkBindUtil.ts";

const HEALTH_PATH = "/health";
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_ERROR = 500;
const PLAIN_TEXT = "text/plain";

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
    const auth = new HttpAuthService(HttpAuthService.extractTokenSecrets(env.CAPROVER_MCP_HTTP_TOKENS));
    const server = ServerBuilder.build(env, () => Date.now());
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
    await server.connect(transport);
    const httpServer = createServer((request, response) => {
      void HttpRunner.handleHttpRequest(request, response, auth, transport, env).catch((error: unknown) => {
        LogUtil.logError("http_request_failed", error instanceof Error ? error.message : "unknown");
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
        await transport.close();
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
    auth: HttpAuthService,
    transport: StreamableHTTPServerTransport,
    env: Env,
  ): Promise<void> {
    const url = request.url ?? "";
    if (request.method === "GET" && url.startsWith(HEALTH_PATH)) {
      response.writeHead(HTTP_OK, { "Content-Type": PLAIN_TEXT });
      response.end("ok");
      return;
    }
    if (!auth.verifyRequest(request)) {
      response.writeHead(HTTP_UNAUTHORIZED, { "Content-Type": PLAIN_TEXT });
      response.end("Unauthorized");
      return;
    }
    const parsedBody = await HttpRunner.readParsedBody(request, env);
    await transport.handleRequest(request, response, parsedBody);
  }

  private static readParsedBody(request: import("node:http").IncomingMessage, env: Env): Promise<unknown> {
    if (request.method !== "POST") {
      return Promise.resolve(undefined);
    }
    return HttpBodyUtil.readJson(request, env.CAPROVER_MCP_MAX_HTTP_BODY_BYTES);
  }
}
