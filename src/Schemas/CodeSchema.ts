import { z } from "zod";

export const DEFAULT_SEARCH_LIMIT = 8;
export const MAX_SEARCH_LIMIT = 100;
export const MAX_SCRIPT_CHARS = 20_000;
const MAX_QUERY_CHARS = 200;

export const CodeSearchInputSchema = {
  query: z.string().max(MAX_QUERY_CHARS).describe(
    "Words that name what you want to do, such as `deploy image` or `env vars`. An empty text lists the operations the mode allows.",
  ),
  limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).optional().describe(
    `How many operations to return. Default: ${DEFAULT_SEARCH_LIMIT}. At most ${MAX_SEARCH_LIMIT}.`,
  ),
};

export const CodeSearchOutputSchema = {
  operations: z.array(z.object({
    api: z.string(),
    tool: z.string(),
    risk: z.string(),
    description: z.string(),
    signature: z.string(),
  })),
  total: z.number(),
  isTruncated: z.boolean(),
};

export const CodeExecuteInputSchema = {
  script: z.string().min(1).max(MAX_SCRIPT_CHARS).describe(
    "The body of an async function in JavaScript. Call `await caprover.<object>.<verb>(args)` and `return` the value you need, "
    + "as little as possible. Use `console.log` for notes.",
  ),
};

export const CodeExecuteOutputSchema = {
  output: z.string(),
  isTruncated: z.boolean(),
  logs: z.array(z.string()),
  hostCalls: z.number(),
  error: z.string().optional(),
  line: z.number().optional(),
  limit: z.enum(["time", "memory", "stack", "calls"]).optional(),
};
