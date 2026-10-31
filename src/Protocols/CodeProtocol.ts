import type { PolicyServicePort, RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { ToolDefinition } from "@/Protocols/OperationProtocol.ts";
import type { SandboxLimit, SandboxPort } from "@/Protocols/SandboxProtocol.ts";

export type CodeApiEntry = {
  api: string;
  tool: string;
  risk: RiskTier;
  description: string;
  signature: string;
};

export type CodeSearchResult = {
  matches: CodeApiEntry[];
  total: number;
  isTruncated: boolean;
};

export type CodeExecutionData = {
  output: string;
  isTruncated: boolean;
  logs: string[];
  hostCalls: number;
  error?: string;
  line?: number;
  limit?: SandboxLimit;
};

export type CodeExecutionOutcome = {
  isError: boolean;
  summary: string;
  data: CodeExecutionData;
};

export type CodeExecutionDeps = {
  sandbox: SandboxPort;
  tools: readonly ToolDefinition[];
  secrets: readonly string[];
  isElicitationAvailable: () => boolean;
};

export type CodeSurfaceDeps = CodeExecutionDeps & { policy: PolicyServicePort };
