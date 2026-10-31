import { describe, expect, it } from "vitest";
import { ConfirmationService } from "@/Services/ConfirmationService.ts";

const START_MS = 1_000_000;
const FINGERPRINT = "fingerprint-a";
const OTHER_FINGERPRINT = "fingerprint-b";

describe("ConfirmationService.consumeToken()", () => {
  it("accepts the token for the call it was created for", () => {
    const service = new ConfirmationService(() => START_MS);
    const token = service.createToken(FINGERPRINT);

    expect(service.consumeToken(token, FINGERPRINT)).toBe(true);
  });

  it("accepts a token only once", () => {
    const service = new ConfirmationService(() => START_MS);
    const token = service.createToken(FINGERPRINT);
    service.consumeToken(token, FINGERPRINT);

    expect(service.consumeToken(token, FINGERPRINT)).toBe(false);
  });

  it("refuses the token for a different call", () => {
    const service = new ConfirmationService(() => START_MS);
    const token = service.createToken(FINGERPRINT);

    expect(service.consumeToken(token, OTHER_FINGERPRINT)).toBe(false);
  });

  it("refuses a token it never created", () => {
    const service = new ConfirmationService(() => START_MS);

    const unknownToken = "0".repeat(32);

    expect(service.consumeToken(unknownToken, FINGERPRINT)).toBe(false);
  });

  it("accepts the token one millisecond before it expires", () => {
    let nowMs = START_MS;
    const service = new ConfirmationService(() => nowMs);
    const token = service.createToken(FINGERPRINT);
    nowMs = START_MS + 299_999;

    expect(service.consumeToken(token, FINGERPRINT)).toBe(true);
  });

  it("refuses the token five minutes after it was created", () => {
    let nowMs = START_MS;
    const service = new ConfirmationService(() => nowMs);
    const token = service.createToken(FINGERPRINT);
    nowMs = START_MS + 300_000;

    expect(service.consumeToken(token, FINGERPRINT)).toBe(false);
  });
});

describe("ConfirmationService.createToken()", () => {
  it("returns a different token on each call", () => {
    const service = new ConfirmationService(() => START_MS);

    expect(service.createToken(FINGERPRINT)).not.toBe(service.createToken(FINGERPRINT));
  });
});
