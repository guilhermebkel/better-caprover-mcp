export type LogLevel = "error" | "info" | "debug";

export type LogField = string | number | boolean | undefined;

export type LogFieldNameToValue = Record<string, LogField>;
