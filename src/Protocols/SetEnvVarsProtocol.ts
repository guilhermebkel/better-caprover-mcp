import type { CaproverEnvVar } from "@/Protocols/CaproverClientProtocol.ts";

export type EnvVarsPlan = {
  merged: CaproverEnvVar[];
  addedKeys: string[];
  updatedKeys: string[];
  removedKeys: string[];
};

export type EnvVarsChange = {
  env_vars?: string;
  remove_keys?: string[];
};

export type AppEnvVarsPlan = EnvVarsPlan & { appName: string };
