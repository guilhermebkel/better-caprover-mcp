import { describe, expect, it } from "vitest";
import type { IncomingMessage } from "node:http";
import { HttpAuthService } from "@/Services/HttpAuthService.ts";

const EXPECTED_TOKEN = "secret-one-12345678";

const buildRequest = (authorization?: string): IncomingMessage => ({
  headers: authorization === undefined ? {} : { authorization },
}) as IncomingMessage;

describe("HttpAuthService.verifyRequest()", () => {
  it("accepts a bearer token that matches the configured secret", () => {
    const auth = new HttpAuthService(EXPECTED_TOKEN);
    const request = buildRequest(`Bearer ${EXPECTED_TOKEN}`);
    expect(auth.verifyRequest(request)).toBe(true);
  });

  it("rejects a missing header", () => {
    const auth = new HttpAuthService(EXPECTED_TOKEN);
    const request = buildRequest();
    expect(auth.verifyRequest(request)).toBe(false);
  });

  it("rejects a wrong bearer token", () => {
    const auth = new HttpAuthService(EXPECTED_TOKEN);
    const request = buildRequest("Bearer wrong-token-123456789");
    expect(auth.verifyRequest(request)).toBe(false);
  });

  it("rejects any bearer when no token is configured", () => {
    const auth = new HttpAuthService(undefined);
    const request = buildRequest(`Bearer ${EXPECTED_TOKEN}`);
    expect(auth.verifyRequest(request)).toBe(false);
  });
});
