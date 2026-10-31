export type SandboxLimit = "time" | "memory" | "stack" | "calls";

export type SandboxLimits = {
  cpuMs: number;
  wallMs: number;
  memoryBytes: number;
  stackBytes: number;
  maxHostCalls: number;
  maxOutputChars: number;
  maxLogChars: number;
};

export type SandboxHostCall = (apiName: string, args: unknown) => Promise<unknown>;

export type SandboxRun = {
  script: string;
  apiNames: readonly string[];
  hostCall: SandboxHostCall;
};

export type SandboxFailure = {
  message: string;
  line?: number;
  limit?: SandboxLimit;
};

export type SandboxResult = {
  isOk: boolean;
  output: string;
  isTruncated: boolean;
  logs: string[];
  hostCalls: number;
  error?: string;
  line?: number;
  limit?: SandboxLimit;
};

export interface SandboxPort { run(request: SandboxRun): Promise<SandboxResult> }

export type SandboxMeasure = <Value>(work: () => Value) => Value;
