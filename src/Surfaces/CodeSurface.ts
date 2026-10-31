import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PolicyServicePort } from "@/Protocols/AccessProtocol.ts";
import type { CodeApiEntry, CodeSurfaceDeps } from "@/Protocols/CodeProtocol.ts";
import {
  CodeExecuteInputSchema,
  CodeExecuteOutputSchema,
  CodeSearchInputSchema,
  CodeSearchOutputSchema,
  DEFAULT_SEARCH_LIMIT,
} from "@/Schemas/CodeSchema.ts";
import { CodeApiService } from "@/Services/CodeApiService.ts";
import { CodeExecutionService } from "@/Services/CodeExecutionService.ts";

export class CodeSurface {
  static readonly SEARCH_DESCRIPTION = "Read-only. Finds CapRover operations for a script: returns each operation's `caprover.*` signature, "
    + "its risk tier and its description. It never calls CapRover and lists only what the access mode allows. "
    + "Call it before `execute` to learn the names and the fields. To run a script, use `execute`.";

  static readonly EXECUTE_DESCRIPTION = "Runs a short JavaScript script in a sandbox with no network, files or modules; the only things it can call are the "
    + "`caprover.<object>.<verb>(args)` operations that `search` returns. The script is the body of an async function: `return` the value you need "
    + "(JSON, cut at the output limit). Every call goes through the same access mode, risk tiers and redaction as the named tools; "
    + "a call the mode forbids throws the same message. A destructive or critical call is refused unless the client can ask the person "
    + "directly; `dry_run: true` previews it. Limits: computing time, memory, stack, number of calls and output size. "
    + "Use `search` first to find the operations.";

  static register(server: McpServer, deps: CodeSurfaceDeps): void {
    const entries = CodeApiService.buildEntries(deps.tools);
    const execution = new CodeExecutionService({
      sandbox: deps.sandbox,
      tools: deps.tools,
      secrets: deps.secrets,
      isElicitationAvailable: deps.isElicitationAvailable,
    });
    server.registerTool(
      "search",
      {
        description: CodeSurface.SEARCH_DESCRIPTION,
        inputSchema: CodeSearchInputSchema,
        outputSchema: CodeSearchOutputSchema,
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      },
      ({ query, limit }) => {
        const allowed = entries.filter((entry) => CodeSurface.isAllowed(entry, deps.policy));
        const found = CodeApiService.search(allowed, query, limit ?? DEFAULT_SEARCH_LIMIT);
        const data = { operations: found.matches, total: found.total, isTruncated: found.isTruncated };
        const more = found.isTruncated ? ` ${found.total - found.matches.length} more match: narrow the query or raise \`limit\`.` : "";
        const summary = `${found.matches.length} of ${found.total} operations.${more}`;
        return { content: [{ type: "text" as const, text: `${summary}\n${JSON.stringify(data)}` }], structuredContent: data };
      },
    );
    server.registerTool(
      "execute",
      {
        description: CodeSurface.EXECUTE_DESCRIPTION,
        inputSchema: CodeExecuteInputSchema,
        outputSchema: CodeExecuteOutputSchema,
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
      },
      async ({ script }) => {
        const outcome = await execution.execute(script);
        const text = `${outcome.summary}\n${JSON.stringify(outcome.data)}`;
        return { content: [{ type: "text" as const, text }], structuredContent: outcome.data, isError: outcome.isError };
      },
    );
  }

  private static isAllowed(entry: CodeApiEntry, policy: PolicyServicePort): boolean {
    return policy.canRun(entry.risk);
  }
}
