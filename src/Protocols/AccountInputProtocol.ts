import type { ControlFields } from "@/Protocols/ControlProtocol.ts";

export type SetPasswordInput = ControlFields & { new_password: string };

export type SetProApiKeyInput = Pick<ControlFields, "dry_run"> & { api_key: string };

export type ListProAlertsField = "eventName" | "actionName";

export type ListThemesField = "themeName" | "isBuiltIn";

export type ThemeNameInput = { theme_name: string };

export type SetCurrentThemeInput = Pick<ControlFields, "dry_run"> & ThemeNameInput;

export type SaveThemeInput = Pick<ControlFields, "dry_run"> & ThemeNameInput & {
  previous_name?: string;
  theme_content: string;
};

export type DeleteThemeInput = ControlFields & ThemeNameInput;
