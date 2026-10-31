import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const APP_DEFINITIONS_PATH = "/api/v2/user/apps/appDefinitions";
const LOGIN_PATH = "/api/v2/login";

export type MockRequest = {
  method: string;
  path: string;
  query: string;
  token: string | undefined;
  body: unknown;
};

export class MockCaproverServer {
  static readonly TOKEN = "fake-session-token";

  readonly requests: MockRequest[] = [];

  private server: Server | undefined;

  constructor(
    private readonly routeToReply: Map<string, string>,
    private readonly options: { hangGetAppDefinitionsUntil?: () => Promise<void> } = {},
  ) {}

  async start(): Promise<string> {
    const server = createServer((request, response) => {
      void this.handle(request, response);
    });
    this.server = server;
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        resolve();
      });
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (server === undefined) {
      return;
    }
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const body = await MockCaproverServer.readBody(request);
    const method = request.method ?? "GET";
    const [path = "/", query = ""] = (request.url ?? "/").split("?");
    const tokenHeader = request.headers["x-captain-auth"];
    const token = typeof tokenHeader === "string" ? tokenHeader : undefined;
    this.requests.push({ method, path, query, token, body });
    const pathToOptionalHang = new Map<string, (() => Promise<void>) | undefined>([
      [APP_DEFINITIONS_PATH, this.options.hangGetAppDefinitionsUntil],
    ]);
    const hang = pathToOptionalHang.get(path);
    if (hang !== undefined) {
      await hang();
    }
    const openWithoutTokenPaths = new Set<string>([LOGIN_PATH]);
    const routeLookupKey = openWithoutTokenPaths.has(path) || token === MockCaproverServer.TOKEN
      ? `${method} ${path}`
      : "TOKEN_INVALID";
    const reply = this.routeToReply.get(routeLookupKey);
    // Why: a real CapRover answers an unknown path with a plain HTTP 404, which the SDK reports as "HTTP 404: Not Found".
    response.statusCode = reply === undefined ? HTTP_NOT_FOUND : HTTP_OK;
    response.setHeader("content-type", "application/json");
    response.end(reply ?? "Not Found");
  }

  private static async readBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk as Uint8Array));
    }
    const text = Buffer.concat(chunks).toString("utf8");
    return text === "" ? undefined : JSON.parse(text);
  }
}
