import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { ToolDefinition } from "@/Protocols/OperationProtocol.ts";
import { ServerToolInputObjectSchema, ServerToolInputSchema } from "@/Schemas/ServerConfigSchema.ts";

export class ToolsSurface {
  static readonly RISK_TO_ANNOTATIONS: Record<RiskTier, ToolAnnotations> = {
    read: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    write: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    destructive: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    critical: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  };

  static register(server: McpServer, tools: readonly ToolDefinition[]): void {
    for (const tool of tools) {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: ToolsSurface.buildInputSchema(tool.inputSchema),
          annotations: ToolsSurface.RISK_TO_ANNOTATIONS[tool.risk],
        },
        async (args: unknown) => {
          const outcome = await tool.call(args);
          // Why: some clients show only the text content to the model, so the text carries the data too.
          const text = `${outcome.summary}\n${JSON.stringify(outcome.data)}`;
          return { content: [{ type: "text" as const, text }], structuredContent: outcome.data, isError: outcome.isError };
        },
      );
    }
  }

  private static buildInputSchema(inputSchema: z.ZodType): z.ZodType {
    if (inputSchema instanceof z.ZodObject) {
      return inputSchema.extend(ServerToolInputObjectSchema.shape);
    }
    return ServerToolInputSchema.and(inputSchema);
  }
}
