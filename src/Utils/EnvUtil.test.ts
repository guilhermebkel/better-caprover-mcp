import { afterEach, describe, expect, it, vi } from "vitest";
import { InvalidEnvError } from "@/Errors/InvalidEnvError.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";

describe("EnvUtil.read()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("when no variable is set", () => {
    it("starts in readonly mode", () => {
      vi.stubEnv("CAPROVER_MCP_MODE", undefined);

      expect(EnvUtil.read()).toStrictEqual({ CAPROVER_MCP_MODE: "readonly" });
    });
  });

  describe("when the mode is set", () => {
    it("accepts operate", () => {
      vi.stubEnv("CAPROVER_MCP_MODE", "operate");

      expect(EnvUtil.read()).toStrictEqual({ CAPROVER_MCP_MODE: "operate" });
    });

    it("refuses a mode that does not exist and names the variable", () => {
      vi.stubEnv("CAPROVER_MCP_MODE", "root");

      expect(() => EnvUtil.read()).toThrow(InvalidEnvError);
      expect(() => EnvUtil.read()).toThrow(/CAPROVER_MCP_MODE/);
    });
  });
});
