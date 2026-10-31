import { AsyncLocalStorage } from "node:async_hooks";
import { CaproverClientAdapter } from "@/Adapters/CapRover/CaproverClientAdapter.ts";
import { UnknownServerError } from "@/Errors/UnknownServerError.ts";
import type { RiskTier } from "@/Protocols/AccessProtocol.ts";
import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { Env, ResolvedCaproverServer } from "@/Protocols/EnvProtocol.ts";
import type { ServerSummary } from "@/Protocols/ServerRoutingProtocol.ts";
import { DEFAULT_SERVER_NAME } from "@/Schemas/ServerConfigSchema.ts";
import { PolicyService } from "@/Services/PolicyService.ts";

export type ActiveServerTarget = {
  name: string;
  client: CaproverClientPort;
  policy: PolicyService;
  secrets: readonly string[];
};

type ServerRecord = ActiveServerTarget;

export type CaproverClientFactory = (entry: ResolvedCaproverServer) => CaproverClientPort;

export class CaproverServerRegistryService {
  static readonly activeStorage = new AsyncLocalStorage<ActiveServerTarget>();

  private constructor(
    private readonly nameToServer: ReadonlyMap<string, ServerRecord>,
    private readonly isMultiServer: boolean,
    private readonly httpToken: string | undefined,
  ) {}

  static buildFromEnv(
    env: Env,
    createClient: CaproverClientFactory = (entry) => CaproverServerRegistryService.createDefaultClient(entry),
  ): CaproverServerRegistryService {
    const isMultiServer = env.servers.length > 1;
    const nameToServer = new Map<string, ServerRecord>();
    for (const entry of env.servers) {
      const client = createClient(entry);
      const policy = new PolicyService(entry.mode, entry.isCriticalAllowed, isMultiServer);
      const secrets = entry.password === undefined ? [] : [entry.password];
      nameToServer.set(entry.name, { name: entry.name, client, policy, secrets });
    }
    const httpToken = env.CAPROVER_MCP_HTTP_TOKEN;
    return new CaproverServerRegistryService(nameToServer, isMultiServer, httpToken);
  }

  private static createDefaultClient(entry: ResolvedCaproverServer): CaproverClientPort {
    if (entry.url !== undefined && entry.password !== undefined) {
      return new CaproverClientAdapter({ url: entry.url, password: entry.password });
    }
    return new CaproverClientAdapter(undefined);
  }

  getIsMultiServer(): boolean {
    return this.isMultiServer;
  }

  listNames(): string[] {
    return [...this.nameToServer.keys()].sort();
  }

  listSummaries(): ServerSummary[] {
    return this.listNames().map((name) => {
      const record = this.nameToServer.get(name);
      if (record === undefined) {
        throw new Error(`Missing server ${name}`);
      }
      return {
        name,
        accessMode: record.policy.getMode(),
        enabledRiskTiers: record.policy.getEnabledTiers(),
      };
    });
  }

  collectAllSecrets(): string[] {
    const secrets: string[] = [];
    if (this.httpToken !== undefined) {
      secrets.push(this.httpToken);
    }
    for (const record of this.nameToServer.values()) {
      secrets.push(...record.secrets);
    }
    return secrets;
  }

  resolve(serverName: string | undefined): ActiveServerTarget {
    if (this.isMultiServer && serverName === undefined) {
      throw new UnknownServerError(undefined, this.listNames());
    }
    const name = serverName ?? DEFAULT_SERVER_NAME;
    const record = this.nameToServer.get(name);
    if (record === undefined) {
      throw new UnknownServerError(serverName, this.listNames());
    }
    return record;
  }

  getActivePolicy(): PolicyService {
    const active = CaproverServerRegistryService.activeStorage.getStore();
    if (active === undefined) {
      throw new Error("No active CapRover server for this call.");
    }
    return active.policy;
  }

  canRunOnAnyServer(risk: RiskTier): boolean {
    for (const record of this.nameToServer.values()) {
      if (record.policy.canRun(risk)) {
        return true;
      }
    }
    return false;
  }
}
