import {
  buildChangeOutputSchema,
  buildListOutputSchema,
  buildReadOutputSchema,
  FlagOutputSchema,
  TextOutputSchema,
} from "@/Schemas/OutputSchema.ts";

export const GetTwoFactorStatusOutputSchema = buildReadOutputSchema({ isTwoFactorEnabled: FlagOutputSchema });

export const SetPasswordOutputSchema = buildChangeOutputSchema({ mustUpdateServerConfig: FlagOutputSchema });

export const GetProStateOutputSchema = buildReadOutputSchema({
  isFeatureFlagEnabled: FlagOutputSchema,
  isSubscribed: FlagOutputSchema,
});

export const SetProApiKeyOutputSchema = buildChangeOutputSchema({ isKeySet: FlagOutputSchema });

export const ListProAlertsOutputSchema = buildListOutputSchema("alerts");

export const ListThemesOutputSchema = buildListOutputSchema("themes");

export const GetCurrentThemeOutputSchema = buildReadOutputSchema({ themeName: TextOutputSchema });

export const SetCurrentThemeOutputSchema = buildChangeOutputSchema({
  themeName: TextOutputSchema,
  previousThemeName: TextOutputSchema,
});

export const SaveThemeOutputSchema = buildChangeOutputSchema({
  themeName: TextOutputSchema,
  isNewTheme: FlagOutputSchema,
});

export const DeleteThemeOutputSchema = buildChangeOutputSchema({ themeName: TextOutputSchema });
