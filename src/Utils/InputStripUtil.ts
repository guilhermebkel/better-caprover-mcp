import { CONTROL_KEYS } from "@/Schemas/ControlSchema.ts";

export class InputStripUtil {
  static stripControlFields(rawInput: unknown): unknown {
    if (typeof rawInput !== "object" || rawInput === null || Array.isArray(rawInput)) {
      return rawInput;
    }
    const entries = Object.entries(rawInput).filter(([key]) => !CONTROL_KEYS.includes(key as never));
    return Object.fromEntries(entries);
  }
}
