import { createHash } from "node:crypto";
import { CONTROL_KEYS } from "@/Schemas/ControlSchema.ts";

export class FingerprintUtil {
  static build(toolName: string, input: unknown): string {
    const withoutControl = FingerprintUtil.omitControlKeys(input);
    const canonical = JSON.stringify(FingerprintUtil.sortKeys(withoutControl));
    return createHash("sha256").update(`${toolName}\n${canonical}`).digest("hex");
  }

  private static omitControlKeys(input: unknown): unknown {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return input;
    }
    return Object.fromEntries(
      Object.entries(input).filter(([key]) => !CONTROL_KEYS.some((controlKey) => controlKey === key)),
    );
  }

  private static sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item: unknown) => FingerprintUtil.sortKeys(item));
    }
    if (typeof value === "object" && value !== null) {
      const sorted = Object.entries(value).toSorted(([first], [second]) => first.localeCompare(second));
      return Object.fromEntries(sorted.map(([key, item]) => [key, FingerprintUtil.sortKeys(item)]));
    }
    return value;
  }
}
