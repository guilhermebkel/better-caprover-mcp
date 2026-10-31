import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const PLAIN_TEXT = "text/plain";
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVICE_UNAVAILABLE = 503;
const DEFAULT_SESSION_TTL_MS = 86_400_000;
const DEFAULT_MAX_SESSIONS = 64;

export type ConnectableMcpServer = { connect(transport: StreamableHTTPServerTransport): Promise<void> };

export type McpServerBuilder = () => ConnectableMcpServer;

type SessionRecord = {
  transport: StreamableHTTPServerTransport;
  tokenKey: string;
  expiresAtMs: number;
};

const isInitializeBody = (parsedBody: unknown): boolean => {
  if (parsedBody === undefined) {
    return false;
  }
  const messages = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
  return messages.some((message) => {
    if (typeof message !== "object" || message === null || !("method" in message)) {
      return false;
    }
    const method = (message as { method?: unknown }).method;
    return method === "initialize";
  });
};

export class HttpSessionRunner {
  private readonly sessionIdToSession = new Map<string, SessionRecord>();

  constructor(
    private readonly buildMcpServer: McpServerBuilder,
    private readonly getNowMs: () => number,
    private readonly maxSessions = DEFAULT_MAX_SESSIONS,
    private readonly sessionTtlMs = DEFAULT_SESSION_TTL_MS,
  ) {}

  async handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    parsedBody: unknown,
    tokenKey: string,
  ): Promise<void> {
    this.dropExpiredSessions();
    const sessionHeader = request.headers["mcp-session-id"];
    const sessionId = typeof sessionHeader === "string" && sessionHeader !== "" ? sessionHeader : undefined;
    if (sessionId !== undefined) {
      const session = this.sessionIdToSession.get(sessionId);
      if (session === undefined) {
        response.writeHead(HTTP_NOT_FOUND, { "Content-Type": PLAIN_TEXT });
        response.end("Not Found");
        return;
      }
      if (session.tokenKey !== tokenKey) {
        response.writeHead(HTTP_NOT_FOUND, { "Content-Type": PLAIN_TEXT });
        response.end("Not Found");
        return;
      }
      await session.transport.handleRequest(request, response, parsedBody);
      return;
    }
    if (!isInitializeBody(parsedBody)) {
      response.writeHead(HTTP_BAD_REQUEST, { "Content-Type": PLAIN_TEXT });
      response.end("Bad Request");
      return;
    }
    if (this.sessionIdToSession.size >= this.maxSessions) {
      response.writeHead(HTTP_SERVICE_UNAVAILABLE, { "Content-Type": PLAIN_TEXT });
      response.end("Service Unavailable");
      return;
    }
    const server = this.buildMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        this.sessionIdToSession.set(id, {
          transport,
          tokenKey,
          expiresAtMs: this.getNowMs() + this.sessionTtlMs,
        });
      },
      onsessionclosed: (id) => {
        this.sessionIdToSession.delete(id);
      },
    });
    await server.connect(transport);
    await transport.handleRequest(request, response, parsedBody);
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.sessionIdToSession.values()].map(async (session) => session.transport.close()));
    this.sessionIdToSession.clear();
  }

  private dropExpiredSessions(): void {
    const nowMs = this.getNowMs();
    for (const [sessionId, session] of this.sessionIdToSession.entries()) {
      if (session.expiresAtMs <= nowMs) {
        void session.transport.close();
        this.sessionIdToSession.delete(sessionId);
      }
    }
  }
}
