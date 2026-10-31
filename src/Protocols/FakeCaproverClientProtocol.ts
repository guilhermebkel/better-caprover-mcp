export type FakeCaproverOptions = {
  appLogs?: string;
  buildLines?: string[];
  failureMessage?: string;
  delayMs?: number;
  hangUntilReleased?: () => Promise<void>;
};
