import type { IncomingMessage, ServerResponse } from "node:http";

export type HttpSessionTransport = {
  handleRequest(request: IncomingMessage, response: ServerResponse, parsedBody?: unknown): Promise<void>;
  close(): Promise<void>;
};

export type ConnectableMcpServer = { connect(transport: HttpSessionTransport): Promise<void> };

export type McpServerBuilder = () => ConnectableMcpServer;

export type SessionRecord = {
  transport: HttpSessionTransport;
  expiresAtMs: number;
};
