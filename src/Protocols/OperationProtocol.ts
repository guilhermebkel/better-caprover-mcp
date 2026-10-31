import type { z } from "zod";
import type { RiskTier } from "@/Protocols/AccessProtocol.ts";

export type OperationResult = {
  summary: string;
  data: Record<string, unknown>;
};

export type ToolOutcome = {
  isError: boolean;
  summary: string;
  data: Record<string, unknown>;
};

export interface OperationPort<Input> {
  readonly description: string;
  readonly inputSchema: z.ZodType<Input>;
  readonly risk: RiskTier;
  execute(input: Input): Promise<OperationResult>;
  describeChange?(input: Input): Promise<OperationResult>;
}

export type ToolDefinition = {
  name: string;
  description: string;
  risk: RiskTier;
  inputSchema: z.ZodType;
  call: (rawInput: unknown) => Promise<ToolOutcome>;
};
