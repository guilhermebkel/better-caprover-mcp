import { afterEach, describe, expect, it, vi } from "vitest";
import { InvalidEnvError } from "@/Errors/InvalidEnvError.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";

describe("EnvUtil.read()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("when no variable is set", () => {
    it("starts in readonly mode with critical locked and no CapRover to reach", () => {
      vi.stubEnv("CAPROVER_MCP_MODE", undefined);

      const env = EnvUtil.read();
      expect(env.CAPROVER_MCP_MODE).toBe("readonly");
      expect(env.CAPROVER_MCP_ALLOW_CRITICAL).toBe(false);
      expect(env.CAPROVER_URL).toBeUndefined();
      expect(env.CAPROVER_PASSWORD).toBeUndefined();
    });
  });

  describe("when the surface is set", () => {
    it("defaults to tools", () => {
      vi.stubEnv("CAPROVER_MCP_SURFACE", undefined);

      expect(EnvUtil.read().CAPROVER_MCP_SURFACE).toBe("tools");
    });

    it.each(["tools", "code", "both"])("accepts %s", (surface) => {
      vi.stubEnv("CAPROVER_MCP_SURFACE", surface);

      expect(EnvUtil.read().CAPROVER_MCP_SURFACE).toBe(surface);
    });

    it("treats an empty value as tools", () => {
      vi.stubEnv("CAPROVER_MCP_SURFACE", "");

      expect(EnvUtil.read().CAPROVER_MCP_SURFACE).toBe("tools");
    });

    it("refuses a surface that does not exist and names the variable and the valid values", () => {
      vi.stubEnv("CAPROVER_MCP_SURFACE", "script");

      expect(() => EnvUtil.read()).toThrow(InvalidEnvError);
      expect(() => EnvUtil.read()).toThrow(/CAPROVER_MCP_SURFACE must be tools, code or both\./);
    });
  });

  describe("when the transport is set", () => {
    it("defaults to stdio", () => {
      vi.stubEnv("CAPROVER_MCP_TRANSPORT", undefined);

      expect(EnvUtil.read().CAPROVER_MCP_TRANSPORT).toBe("stdio");
    });

    it("accepts http", () => {
      vi.stubEnv("CAPROVER_MCP_TRANSPORT", "http");

      expect(EnvUtil.read().CAPROVER_MCP_TRANSPORT).toBe("http");
    });

    it("treats an empty value as stdio", () => {
      vi.stubEnv("CAPROVER_MCP_TRANSPORT", "");

      expect(EnvUtil.read().CAPROVER_MCP_TRANSPORT).toBe("stdio");
    });

    it("refuses a transport that does not exist and names the variable", () => {
      vi.stubEnv("CAPROVER_MCP_TRANSPORT", "sse");

      expect(() => EnvUtil.read()).toThrow(InvalidEnvError);
      expect(() => EnvUtil.read()).toThrow(/CAPROVER_MCP_TRANSPORT must be stdio or http\./);
    });
  });

  describe("when the log level is set", () => {
    it("defaults to info", () => {
      vi.stubEnv("CAPROVER_MCP_LOG_LEVEL", undefined);

      expect(EnvUtil.read().CAPROVER_MCP_LOG_LEVEL).toBe("info");
    });

    it("accepts debug", () => {
      vi.stubEnv("CAPROVER_MCP_LOG_LEVEL", "debug");

      expect(EnvUtil.read().CAPROVER_MCP_LOG_LEVEL).toBe("debug");
    });

    it("refuses a level that does not exist and names the variable", () => {
      vi.stubEnv("CAPROVER_MCP_LOG_LEVEL", "trace");

      expect(() => EnvUtil.read()).toThrow(InvalidEnvError);
      expect(() => EnvUtil.read()).toThrow(/CAPROVER_MCP_LOG_LEVEL must be error, info or debug\./);
    });
  });

  describe("when the mode is set", () => {
    it("accepts operate", () => {
      vi.stubEnv("CAPROVER_MCP_MODE", "operate");

      expect(EnvUtil.read().CAPROVER_MCP_MODE).toBe("operate");
    });

    it("refuses a mode that does not exist and names the variable", () => {
      vi.stubEnv("CAPROVER_MCP_MODE", "root");

      expect(() => EnvUtil.read()).toThrow(InvalidEnvError);
      expect(() => EnvUtil.read()).toThrow(/CAPROVER_MCP_MODE/);
    });
  });

  describe("when critical operations are requested", () => {
    it("unlocks them only for the value 1", () => {
      vi.stubEnv("CAPROVER_MCP_ALLOW_CRITICAL", "1");

      expect(EnvUtil.read().CAPROVER_MCP_ALLOW_CRITICAL).toBe(true);
    });

    it("keeps them locked for any other value", () => {
      vi.stubEnv("CAPROVER_MCP_ALLOW_CRITICAL", "true");

      expect(EnvUtil.read().CAPROVER_MCP_ALLOW_CRITICAL).toBe(false);
    });
  });

  describe("when the CapRover address is set", () => {
    it("keeps only the origin, so a trailing slash or API path does no harm", () => {
      vi.stubEnv("CAPROVER_URL", "https://captain.example.com/api/v2/");

      expect(EnvUtil.read().CAPROVER_URL).toBe("https://captain.example.com");
    });

    it("refuses an address without a scheme and names the variable", () => {
      vi.stubEnv("CAPROVER_URL", "captain.example.com");

      expect(() => EnvUtil.read()).toThrow(/CAPROVER_URL must be a URL/);
    });

    it("treats an empty value as not set", () => {
      vi.stubEnv("CAPROVER_URL", "");

      expect(EnvUtil.read().CAPROVER_URL).toBeUndefined();
    });
  });

  describe("when the password is set", () => {
    it("reads it as it is", () => {
      vi.stubEnv("CAPROVER_PASSWORD", "fake password with spaces");

      expect(EnvUtil.read().CAPROVER_PASSWORD).toBe("fake password with spaces");
    });
  });

  describe("when HTTP limits are set", () => {
    it("refuses a non-positive CAPROVER_MCP_HTTP_PORT", () => {
      vi.stubEnv("CAPROVER_MCP_HTTP_PORT", "0");

      expect(() => EnvUtil.read()).toThrow(/CAPROVER_MCP_HTTP_PORT must be a positive integer/);
    });
  });

  describe("when the HTTP token is set", () => {
    it("treats an empty value as not set", () => {
      vi.stubEnv("CAPROVER_MCP_HTTP_TOKEN", "");

      expect(EnvUtil.read().CAPROVER_MCP_HTTP_TOKEN).toBeUndefined();
    });

    it("refuses a token shorter than the minimum with the exact message", () => {
      vi.stubEnv("CAPROVER_MCP_HTTP_TOKEN", "short");

      expect(() => EnvUtil.read()).toThrow(InvalidEnvError);
      expect(() => EnvUtil.read()).toThrow(/CAPROVER_MCP_HTTP_TOKEN must be at least 8 characters\./);
    });
  });

  describe("when toolsets are set", () => {
    it("registers the core, apps, domains and one-click toolsets when the variable is not set", () => {
      vi.stubEnv("CAPROVER_MCP_TOOLSETS", undefined);

      expect(EnvUtil.read().CAPROVER_MCP_TOOLSETS).toStrictEqual(["core", "apps", "domains", "oneclick"]);
    });

    it("treats a blank value as not set", () => {
      vi.stubEnv("CAPROVER_MCP_TOOLSETS", " ");

      expect(EnvUtil.read().CAPROVER_MCP_TOOLSETS).toStrictEqual(["core", "apps", "domains", "oneclick"]);
    });

    it("reads a list, trims the names and drops repeats", () => {
      vi.stubEnv("CAPROVER_MCP_TOOLSETS", "core, projects ,core,registries");

      expect(EnvUtil.read().CAPROVER_MCP_TOOLSETS).toStrictEqual(["core", "projects", "registries"]);
    });

    it("refuses an unknown name and lists the valid ones", () => {
      vi.stubEnv("CAPROVER_MCP_TOOLSETS", "core,pizza");

      expect(() => EnvUtil.read()).toThrow(InvalidEnvError);
      expect(() => EnvUtil.read()).toThrow(
        "CAPROVER_MCP_TOOLSETS names unknown toolsets: pizza. Valid names: core, apps, domains, projects, oneclick, "
        + "registries, cluster, maintenance, monitoring, account.",
      );
    });
  });
});
