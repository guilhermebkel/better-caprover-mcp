export type AccessMode = "readonly" | "operate" | "admin";

export type RiskTier = "read" | "write" | "destructive" | "critical";

export interface PolicyServicePort {
  getMode(): AccessMode;
  getEnabledTiers(): RiskTier[];
  canRun(risk: RiskTier): boolean;
  assertCanRun(toolName: string, risk: RiskTier): void;
}
