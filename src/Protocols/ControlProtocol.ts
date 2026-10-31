export type ControlFields = {
  server_name?: string;
  dry_run?: boolean;
  user_confirmed?: boolean;
  confirmation_token?: string;
};

export type ControlKey = keyof ControlFields;
