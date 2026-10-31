export type ControlKey = "dry_run" | "user_confirmed" | "confirmation_token";

export type ControlFields = {
  dry_run?: boolean;
  user_confirmed?: boolean;
  confirmation_token?: string;
};
