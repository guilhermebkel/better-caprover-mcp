import type {
  CaproverAppRuntime,
  CaproverDiskSeverity,
  CaproverSystemInfo,
  CaproverUnusedImage,
} from "@/Protocols/CaproverClientProtocol.ts";

export type FakeBuildState = {
  isBuilding?: boolean;
  isFailed?: boolean;
};

export type FakeCaproverOptions = {
  appLogs?: string;
  runtime?: Partial<CaproverAppRuntime>;
  buildState?: FakeBuildState;
  diskSeverity?: CaproverDiskSeverity;
  systemInfo?: Partial<CaproverSystemInfo>;
  unusedImages?: CaproverUnusedImage[];
  buildLines?: string[];
  failureMessage?: string;
  failOnCall?: string;
  delayMs?: number;
  hangUntilReleased?: () => Promise<void>;
};
