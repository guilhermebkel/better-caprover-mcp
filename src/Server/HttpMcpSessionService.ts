import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { ServerBuilder } from "@/Server/ServerBuilder.ts";

const PLAIN_TEXT = "text/plain";
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;

type SessionRecord = { transport: StreamableHTTPServerTransport };

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

export class HttpMcpSessionService {
  private readonly sessionIdToSession = new Map<string, SessionRecord>();

  constructor(
    private readonly env: Env,
    private readonly getNowMs: () => number,
  ) {}

  async handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
    parsedBody: unknown,
  ): Promise<void> {
    const sessionHeader = request.headers["mcp-session-id"];
    const sessionId = typeof sessionHeader === "string" && sessionHeader !== "" ? sessionHeader : undefined;
    if (sessionId !== undefined) {
      const session = this.sessionIdToSession.get(sessionId);
      if (session === undefined) {
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
    const server = ServerBuilder.build(this.env, this.getNowMs);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        this.sessionIdToSession.set(id, { transport });
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
}
