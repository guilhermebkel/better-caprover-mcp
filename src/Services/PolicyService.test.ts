import { describe, expect, it } from "vitest";
import { OperationDeniedError } from "@/Errors/OperationDeniedError.ts";
import type { AccessMode, RiskTier } from "@/Protocols/AccessProtocol.ts";
import { PolicyService } from "@/Services/PolicyService.ts";

type TierCase = {
  mode: AccessMode;
  isCriticalAllowed: boolean;
  risk: RiskTier;
  expected: boolean;
};

const CASES: TierCase[] = [
  { mode: "readonly", isCriticalAllowed: false, risk: "read", expected: true },
  { mode: "readonly", isCriticalAllowed: false, risk: "write", expected: false },
  { mode: "readonly", isCriticalAllowed: false, risk: "destructive", expected: false },
  { mode: "operate", isCriticalAllowed: false, risk: "write", expected: true },
  { mode: "operate", isCriticalAllowed: false, risk: "destructive", expected: false },
  { mode: "admin", isCriticalAllowed: false, risk: "destructive", expected: true },
  { mode: "admin", isCriticalAllowed: false, risk: "critical", expected: false },
  { mode: "admin", isCriticalAllowed: true, risk: "critical", expected: true },
  { mode: "operate", isCriticalAllowed: true, risk: "critical", expected: false },
];

describe("PolicyService.canRun()", () => {
  it.each(CASES)("answers $expected for $risk in $mode (critical unlocked: $isCriticalAllowed)", (row) => {
    const policy = new PolicyService(row.mode, row.isCriticalAllowed);

    expect(policy.canRun(row.risk)).toBe(row.expected);
  });
});

describe("PolicyService.getEnabledTiers()", () => {
  it("lists only read in readonly mode", () => {
    expect(new PolicyService("readonly", false).getEnabledTiers()).toStrictEqual(["read"]);
  });

  it("lists read and write in operate mode", () => {
    expect(new PolicyService("operate", false).getEnabledTiers()).toStrictEqual(["read", "write"]);
  });

  it("leaves critical out in admin mode until it is unlocked", () => {
    expect(new PolicyService("admin", false).getEnabledTiers()).toStrictEqual(["read", "write", "destructive"]);
  });

  it("lists every tier in admin mode with critical unlocked", () => {
    expect(new PolicyService("admin", true).getEnabledTiers()).toStrictEqual(["read", "write", "destructive", "critical"]);
  });
});

describe("PolicyService.getMode()", () => {
  it("returns the mode the server started with", () => {
    expect(new PolicyService("operate", false).getMode()).toBe("operate");
  });
});

describe("PolicyService.assertCanRun()", () => {
  it("lets an allowed operation through", () => {
    const policy = new PolicyService("operate", false);

    expect(() => {
      policy.assertCanRun("scale_app", "write");
    }).not.toThrow();
  });

  it("refuses a write in readonly mode and names the mode the person must set", () => {
    const policy = new PolicyService("readonly", false);

    const run = (): void => {
      policy.assertCanRun("scale_app", "write");
    };

    expect(run).toThrow(OperationDeniedError);
    expect(run).toThrow(/CAPROVER_MCP_MODE=operate/);
  });

  it("names the extra switch when a critical operation is refused", () => {
    const policy = new PolicyService("admin", false);

    expect(() => {
      policy.assertCanRun("wipe", "critical");
    }).toThrow(/CAPROVER_MCP_MODE=admin and CAPROVER_MCP_ALLOW_CRITICAL=1/);
  });
});

describe("PolicyService.isCriticalUnlocked()", () => {
  it("is true only when the switch is on", () => {
    expect([new PolicyService("admin", true).isCriticalUnlocked(), new PolicyService("admin", false).isCriticalUnlocked()])
      .toStrictEqual([true, false]);
  });
});
