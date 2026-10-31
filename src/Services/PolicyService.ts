import { OperationDeniedError } from "@/Errors/OperationDeniedError.ts";
import type { AccessMode, RiskTier } from "@/Protocols/AccessProtocol.ts";

const TIERS_NEEDING_SWITCH: ReadonlySet<RiskTier> = new Set<RiskTier>(["critical"]);

export class PolicyService {
  static readonly MODE_TO_TIERS: Record<AccessMode, readonly RiskTier[]> = {
    readonly: ["read"],
    operate: ["read", "write"],
    admin: ["read", "write", "destructive", "critical"],
  };

  static readonly RISK_TO_MODE: Record<RiskTier, AccessMode> = {
    read: "readonly",
    write: "operate",
    destructive: "admin",
    critical: "admin",
  };

  constructor(
    private readonly mode: AccessMode,
    private readonly isCriticalAllowed: boolean,
  ) {}

  getMode(): AccessMode {
    return this.mode;
  }

  isCriticalUnlocked(): boolean {
    return this.isCriticalAllowed;
  }

  getEnabledTiers(): RiskTier[] {
    return PolicyService.MODE_TO_TIERS[this.mode].filter((risk) => this.canRun(risk));
  }

  canRun(risk: RiskTier): boolean {
    const isInMode = PolicyService.MODE_TO_TIERS[this.mode].includes(risk);
    const isCriticalBlocked = TIERS_NEEDING_SWITCH.has(risk) && !this.isCriticalAllowed;
    return isInMode && !isCriticalBlocked;
  }

  assertCanRun(toolName: string, risk: RiskTier): void {
    if (this.canRun(risk)) {
      return;
    }
    const requiredMode = PolicyService.RISK_TO_MODE[risk];
    const extra = TIERS_NEEDING_SWITCH.has(risk) ? " and CAPROVER_MCP_ALLOW_CRITICAL=1" : "";
    throw new OperationDeniedError(
      `${toolName} is a ${risk} operation. This server runs in "${this.mode}" mode, which does not allow it. `
      + `Do not try another way. Tell the person that CAPROVER_MCP_MODE=${requiredMode}${extra} is needed, `
      + "and that they must set it themselves and restart the server. Topic: read `modes` with `get_guide`.",
    );
  }
}
