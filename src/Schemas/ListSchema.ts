import { z } from "zod";
import type { ListInput } from "@/Protocols/ListProtocol.ts";

export const MAX_LIST_LIMIT = 200;
const MAX_FILTER_LENGTH = 200;
const DEFAULT_LIST_LIMIT_TEXT = "Default: 50.";

export const buildListInputSchema = <Field extends string>(
  fieldNames: readonly [Field, ...Field[]],
  noun: string,
): z.ZodType<ListInput<Field>> => z.strictObject({
  filter: z.string().min(1).max(MAX_FILTER_LENGTH).optional().describe(
    `Keep only ${noun} where any text field contains this text, ignoring case. Default: keep all.`,
  ),
  fields: z.array(z.enum(fieldNames)).min(1).max(fieldNames.length).optional().describe(
    `Names of the fields to return for each of the ${noun}, from: ${fieldNames.join(", ")}. Default: all of them.`,
  ),
  limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional().describe(
    `How many of the ${noun} to return, from 1 to ${MAX_LIST_LIMIT}. ${DEFAULT_LIST_LIMIT_TEXT}`,
  ),
});
