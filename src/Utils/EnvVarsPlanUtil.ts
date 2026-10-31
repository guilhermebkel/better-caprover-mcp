import type { CaproverApp } from "@/Protocols/CaproverClientProtocol.ts";
import type { EnvVarsChange, EnvVarsPlan } from "@/Protocols/SetEnvVarsProtocol.ts";
import { DotenvUtil } from "@/Utils/DotenvUtil.ts";

export class EnvVarsPlanUtil {
  static build(app: CaproverApp, change: EnvVarsChange): EnvVarsPlan {
    const requested = DotenvUtil.parse(change.env_vars ?? "");
    const removeKeys = new Set(change.remove_keys ?? []);
    const currentKeys = new Set(app.envVars.map((envVar) => envVar.key));
    const requestedKeys = new Set(requested.map((envVar) => envVar.key));
    const kept = app.envVars.filter((envVar) => !removeKeys.has(envVar.key) && !requestedKeys.has(envVar.key));
    return {
      merged: [...kept, ...requested.filter((envVar) => !removeKeys.has(envVar.key))],
      addedKeys: [...requestedKeys].filter((key) => !currentKeys.has(key) && !removeKeys.has(key)),
      updatedKeys: [...requestedKeys].filter((key) => currentKeys.has(key) && !removeKeys.has(key)),
      removedKeys: [...removeKeys].filter((key) => currentKeys.has(key)),
    };
  }
}
