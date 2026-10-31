export type ControlFields = {
  dry_run?: boolean;
  user_confirmed?: boolean;
  confirmation_token?: string;
};

export type ControlKey = keyof ControlFields;
