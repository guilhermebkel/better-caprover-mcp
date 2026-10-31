import type { CaproverEnvVar } from "@/Protocols/CaproverClientProtocol.ts";

export type EnvVarsPlan = {
  merged: CaproverEnvVar[];
  addedKeys: string[];
  updatedKeys: string[];
  removedKeys: string[];
};
