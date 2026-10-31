export type AccessMode = "readonly" | "operate" | "admin";

export type Toolset
  = | "core" | "apps" | "domains" | "projects" | "oneclick" | "registries" | "cluster" | "maintenance" | "monitoring"
    | "account";

export type SurfaceName = "tools" | "code" | "both";

export type SurfaceParts = {
  hasTools: boolean;
  hasCode: boolean;
};

export type RiskTier = "read" | "write" | "destructive" | "critical";

export interface PolicyServicePort {
  getMode(): AccessMode;
  getEnabledTiers(): RiskTier[];
  isCriticalUnlocked(): boolean;
  canRun(risk: RiskTier): boolean;
  assertCanRun(toolName: string, risk: RiskTier): void;
}
