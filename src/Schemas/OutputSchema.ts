import { z } from "zod";
import type { OutputData } from "@/Protocols/OperationProtocol.ts";

const CONTROL_OUTPUT_SHAPE: z.ZodRawShape = {
  dry_run: z.boolean().optional(),
  requires_confirmation: z.boolean().optional(),
  confirmation_token: z.string().optional(),
};

export const TextOutputSchema: z.ZodType<string> = z.string();

export const CountOutputSchema: z.ZodType<number> = z.number();

export const FlagOutputSchema: z.ZodType<boolean> = z.boolean();

export const TextListOutputSchema: z.ZodType<string[]> = z.array(z.string());

const RowOutputSchema: z.ZodType<Record<string, unknown>> = z.record(z.string(), z.unknown());

export const RowListOutputSchema: z.ZodType<Record<string, unknown>[]> = z.array(RowOutputSchema);

export const buildReadOutputSchema = (shape: z.ZodRawShape): z.ZodType<OutputData> => z.looseObject(shape);

export const buildChangeOutputSchema = (shape: z.ZodRawShape): z.ZodType<OutputData> => {
  const entries = Object.entries(shape);
  const optionalEntries = entries.map(([key, field]) => [key, z.optional(field)] as const);
  const optionalShape = Object.fromEntries(optionalEntries);
  return z.looseObject({ ...optionalShape, ...CONTROL_OUTPUT_SHAPE });
};

export const buildListOutputSchema = (noun: string): z.ZodType<OutputData> => z.looseObject({
  [noun]: RowListOutputSchema,
  total: CountOutputSchema,
  isTruncated: FlagOutputSchema,
  nextStep: z.string().optional(),
});
