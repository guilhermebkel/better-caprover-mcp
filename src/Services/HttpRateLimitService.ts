import { HttpRateLimitError } from "@/Errors/HttpRateLimitError.ts";

const WINDOW_MS = 60_000;

type RateWindow = {
  windowStartedAtMs: number;
  count: number;
};

export class HttpRateLimitService {
  private window: RateWindow | undefined;

  constructor(private readonly maxRequestsPerWindow: number) {}

  assertAllowed(nowMs: number): void {
    if (this.window === undefined || nowMs - this.window.windowStartedAtMs >= WINDOW_MS) {
      this.window = { windowStartedAtMs: nowMs, count: 1 };
      return;
    }
    if (this.window.count >= this.maxRequestsPerWindow) {
      throw new HttpRateLimitError();
    }
    this.window.count += 1;
  }
}
