import { z } from "zod";
import type { ListInput } from "@/Protocols/ListProtocol.ts";
import type {
  DeleteThemeInput,
  ListProAlertsField,
  ListThemesField,
  SaveThemeInput,
  SetCurrentThemeInput,
  SetPasswordInput,
  SetProApiKeyInput,
} from "@/Protocols/AccountInputProtocol.ts";
import {
  ConfirmationTokenFieldSchema,
  DryRunFieldSchema,
  UserConfirmedFieldSchema,
} from "@/Schemas/ControlSchema.ts";
import { buildListInputSchema } from "@/Schemas/ListSchema.ts";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 29;
const MAX_API_KEY_LENGTH = 500;
const MAX_THEME_NAME_LENGTH = 100;
const MAX_THEME_CONTENT_LENGTH = 100_000;

const ThemeNameFieldSchema = z.string().trim().min(1).max(MAX_THEME_NAME_LENGTH).describe(
  "A theme name as returned by `list_themes`.",
);

export const GetTwoFactorStatusInputSchema: z.ZodType<Record<string, never>> = z.strictObject({});

export const SetPasswordInputSchema: z.ZodType<SetPasswordInput> = z.strictObject({
  new_password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH).describe(
    `The new CapRover password, from ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters. It is sent to CapRover and never returned.`,
  ),
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});

export const GetProStateInputSchema: z.ZodType<Record<string, never>> = z.strictObject({});

export const SetProApiKeyInputSchema: z.ZodType<SetProApiKeyInput> = z.strictObject({
  api_key: z.string().min(1).max(MAX_API_KEY_LENGTH).describe(
    "The CapRover Pro API key. It is sent to CapRover and never returned.",
  ),
  dry_run: DryRunFieldSchema,
});

export const ListProAlertsInputSchema: z.ZodType<ListInput<ListProAlertsField>> = buildListInputSchema(
  ["eventName", "actionName"],
  "alerts",
);

export const ListThemesInputSchema: z.ZodType<ListInput<ListThemesField>> = buildListInputSchema(
  ["themeName", "isBuiltIn"],
  "themes",
);

export const GetCurrentThemeInputSchema: z.ZodType<Record<string, never>> = z.strictObject({});

export const SetCurrentThemeInputSchema: z.ZodType<SetCurrentThemeInput> = z.strictObject({
  theme_name: ThemeNameFieldSchema,
  dry_run: DryRunFieldSchema,
});

export const SaveThemeInputSchema: z.ZodType<SaveThemeInput> = z.strictObject({
  theme_name: z.string().trim().min(1).max(MAX_THEME_NAME_LENGTH).describe("The name of the theme to save, for example `night`."),
  previous_name: z.string().trim().min(1).max(MAX_THEME_NAME_LENGTH).optional().describe(
    "The current name of the theme when this call renames it. Omit to create a theme or to save under the same name.",
  ),
  theme_content: z.string().min(1).max(MAX_THEME_CONTENT_LENGTH).describe(
    "The CSS of the theme for the CapRover dashboard.",
  ),
  dry_run: DryRunFieldSchema,
});

export const DeleteThemeInputSchema: z.ZodType<DeleteThemeInput> = z.strictObject({
  theme_name: ThemeNameFieldSchema,
  dry_run: DryRunFieldSchema,
  user_confirmed: UserConfirmedFieldSchema,
  confirmation_token: ConfirmationTokenFieldSchema,
});
