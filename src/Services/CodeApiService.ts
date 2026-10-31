import { z } from "zod";
import type { ControlKey } from "@/Protocols/ControlProtocol.ts";
import type { CodeApiEntry, CodeSearchResult } from "@/Protocols/CodeProtocol.ts";
import type { ToolDefinition } from "@/Protocols/OperationProtocol.ts";
import { JsonSchemaTsUtil } from "@/Utils/JsonSchemaTsUtil.ts";

const HIDDEN_INPUT_FIELDS: readonly ControlKey[] = ["user_confirmed", "confirmation_token"];
const NAME_MATCH_WEIGHT = 3;
const DESCRIPTION_MATCH_WEIGHT = 1;

export class CodeApiService {
  static readonly API_ROOT = "caprover";

  static buildPath(toolName: string): string {
    const [verb = toolName, ...objectWords] = toolName.split("_");
    const capitalized = objectWords.map((word, index) => (index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`));
    const objectName = capitalized.join("");
    return objectName === "" ? verb : `${objectName}.${verb}`;
  }

  static buildEntries(tools: readonly ToolDefinition[]): CodeApiEntry[] {
    return tools.map((tool) => {
      const api = `${CodeApiService.API_ROOT}.${CodeApiService.buildPath(tool.name)}`;
      const signature = CodeApiService.buildSignature(api, tool);
      return { risk: tool.risk, tool: tool.name, description: tool.description, api, signature };
    });
  }

  static search(entries: readonly CodeApiEntry[], query: string, limit: number): CodeSearchResult {
    const words = query.toLowerCase().split(/[^a-z0-9_]+/).filter((word) => word !== "");
    const scored = entries
      .map((entry) => ({ entry, score: CodeApiService.score(entry, words) }))
      .filter((candidate) => words.length === 0 || candidate.score > 0)
      .toSorted((first, second) => second.score - first.score || first.entry.api.localeCompare(second.entry.api));
    return {
      matches: scored.slice(0, limit).map((candidate) => candidate.entry),
      total: scored.length,
      isTruncated: scored.length > limit,
    };
  }

  private static score(entry: CodeApiEntry, words: readonly string[]): number {
    const names = `${entry.api} ${entry.tool}`.toLowerCase();
    const description = entry.description.toLowerCase();
    const nameScore = words.filter((word) => names.includes(word)).length * NAME_MATCH_WEIGHT;
    const descriptionScore = words.filter((word) => description.includes(word)).length * DESCRIPTION_MATCH_WEIGHT;
    return nameScore + descriptionScore;
  }

  private static buildSignature(api: string, tool: ToolDefinition): string {
    const input = z.toJSONSchema(tool.inputSchema, { io: "input", unrepresentable: "any", reused: "inline" });
    const output = z.toJSONSchema(tool.outputSchema, { io: "output", unrepresentable: "any", reused: "inline" });
    // Why: a script cannot confirm a destructive call, so the confirmation fields are not part of the API it sees.
    const visible = CodeApiService.hideFields(input);
    const hasRequired = Array.isArray(visible.required) && visible.required.length > 0;
    const argument = `args${hasRequired ? "" : "?"}: ${JsonSchemaTsUtil.buildType(visible, true)}`;
    return `${api}(${argument}): Promise<${JsonSchemaTsUtil.buildType(output, false)}>`;
  }

  private static hideFields(schema: Record<string, unknown>): Record<string, unknown> {
    const properties = typeof schema.properties === "object" && schema.properties !== null ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    const isVisible = (name: unknown): boolean => !HIDDEN_INPUT_FIELDS.some((hidden) => hidden === name);
    return {
      ...schema,
      properties: Object.fromEntries(Object.entries(properties).filter(([name]) => isVisible(name))),
      required: required.filter((name: unknown) => isVisible(name)),
    };
  }
}
