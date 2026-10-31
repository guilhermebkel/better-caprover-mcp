import { z } from "zod";
import type { ControlFields, ControlKey } from "@/Protocols/ControlProtocol.ts";

const MAX_TOKEN_LENGTH = 128;

export const DryRunFieldSchema = z.boolean().optional().describe(
  "If true, the call reads the current state and returns what would change, and writes nothing. Default: false.",
);

export const UserConfirmedFieldSchema = z.boolean().optional().describe(
  "Set to true only after the person has seen the preview and said yes. Default: false, which only returns the preview.",
);

export const ConfirmationTokenFieldSchema = z.string().min(1).max(MAX_TOKEN_LENGTH).optional().describe(
  "The `confirmation_token` from the preview of this exact call. It works once and expires after 5 minutes.",
);

export const CONTROL_KEYS: readonly ControlKey[] = ["server", "dry_run", "user_confirmed", "confirmation_token"];

export const ControlFieldsSchema: z.ZodType<ControlFields> = z.object({
  server: z.string().optional(),
  dry_run: z.boolean().optional(),
  user_confirmed: z.boolean().optional(),
  confirmation_token: z.string().optional(),
});
