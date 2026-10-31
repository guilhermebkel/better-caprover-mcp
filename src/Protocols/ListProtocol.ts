export type ListInput<Field extends string> = {
  filter?: string;
  fields?: Field[];
  limit?: number;
};

export type BatchOutcome = {
  applied: string[];
  notApplied: string[];
  failureMessage?: string;
};

export type BatchResultOptions = {
  pastVerb: string;
  noun: string;
  outcome: BatchOutcome;
};

export type ListResultRequest<Field extends string> = {
  noun: string;
  rows: readonly object[];
  input: ListInput<Field>;
};
