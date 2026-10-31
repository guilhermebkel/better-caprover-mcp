import { describe, expect, it } from "vitest";
import type { IncomingMessage } from "node:http";
import { HttpAuthService } from "@/Services/HttpAuthService.ts";

const SECRET_ONE = "secret-one";

const buildRequest = (authorization?: string): IncomingMessage => ({
  headers: authorization === undefined ? {} : { authorization },
}) as IncomingMessage;

describe("HttpAuthService.verifyRequest()", () => {
  it("accepts a bearer token that matches a configured secret", () => {
    const auth = new HttpAuthService(["secret-one", "secret-two"]);
    const request = buildRequest("Bearer secret-two");
    const isAllowed = auth.verifyRequest(request);
    expect(isAllowed).toBe(true);
  });

  it("rejects a missing header", () => {
    const auth = new HttpAuthService([SECRET_ONE]);
    const request = buildRequest();
    const isAllowed = auth.verifyRequest(request);
    expect(isAllowed).toBe(false);
  });

  it("rejects a wrong bearer token", () => {
    const auth = new HttpAuthService([SECRET_ONE]);
    const request = buildRequest("Bearer wrong");
    const isAllowed = auth.verifyRequest(request);
    expect(isAllowed).toBe(false);
  });
});
