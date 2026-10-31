import { HttpRateLimitError } from "@/Errors/HttpRateLimitError.ts";

const WINDOW_MS = 60_000;

type ClientWindow = {
  windowStartedAtMs: number;
  count: number;
};

export class HttpRateLimitService {
  private readonly clientKeyToWindow = new Map<string, ClientWindow>();

  constructor(private readonly maxRequestsPerWindow: number) {}

  assertAllowed(clientKey: string, nowMs: number): void {
    if (this.maxRequestsPerWindow <= 0) {
      return;
    }
    const window = this.clientKeyToWindow.get(clientKey);
    if (window === undefined || nowMs - window.windowStartedAtMs >= WINDOW_MS) {
      this.clientKeyToWindow.set(clientKey, { windowStartedAtMs: nowMs, count: 1 });
      return;
    }
    if (window.count >= this.maxRequestsPerWindow) {
      throw new HttpRateLimitError();
    }
    window.count += 1;
  }
}
