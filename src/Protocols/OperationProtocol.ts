import type { z } from "zod";
import type { RiskTier, Toolset } from "@/Protocols/AccessProtocol.ts";

export type OperationResult = {
  summary: string;
  data: Record<string, unknown>;
  isError?: boolean;
};

export type OutputData = Record<string, unknown>;

export type ToolOutcome = {
  isError: boolean;
  summary: string;
  data: Record<string, unknown>;
};

export interface OperationPort<Input> {
  readonly description: string;
  readonly inputSchema: z.ZodType<Input>;
  readonly outputSchema: z.ZodType<OutputData>;
  readonly risk: RiskTier;
  execute(input: Input): Promise<OperationResult>;
  describeChange?(input: Input): Promise<OperationResult>;
}

export type ToolDefinition = {
  name: string;
  description: string;
  risk: RiskTier;
  toolset: Toolset;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType<OutputData>;
  call: (rawInput: unknown) => Promise<ToolOutcome>;
};
