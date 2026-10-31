import { afterEach, describe, expect, it, vi } from "vitest";
import { UnknownCommandError } from "@/Errors/UnknownCommandError.ts";
import { CliRunner } from "@/Setup/CliRunner.ts";
import { HttpRunner } from "@/Setup/HttpRunner.ts";
import { StdioRunner } from "@/Setup/StdioRunner.ts";

describe("CliRunner.run()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("refuses a command it does not know and says which ones exist", async () => {
    await expect(CliRunner.run(["serve"])).rejects.toBeInstanceOf(UnknownCommandError);
    await expect(CliRunner.run(["serve"])).rejects.toThrow(
      "Unknown command \"serve\". Run without arguments to start the MCP server, or use \"init\" or \"serve --http\".",
    );
  });

  describe("without arguments", () => {
    it("starts stdio when the transport is not set", async () => {
      vi.stubEnv("CAPROVER_MCP_TRANSPORT", undefined);
      const stdio = vi.spyOn(StdioRunner, "run").mockResolvedValue();
      const http = vi.spyOn(HttpRunner, "run").mockResolvedValue();

      await CliRunner.run([]);

      expect(stdio).toHaveBeenCalledOnce();
      expect(http).not.toHaveBeenCalled();
    });

    it("starts HTTP when CAPROVER_MCP_TRANSPORT is http", async () => {
      vi.stubEnv("CAPROVER_MCP_TRANSPORT", "http");
      const stdio = vi.spyOn(StdioRunner, "run").mockResolvedValue();
      const http = vi.spyOn(HttpRunner, "run").mockResolvedValue();

      await CliRunner.run([]);

      expect(http).toHaveBeenCalledOnce();
      expect(stdio).not.toHaveBeenCalled();
    });
  });
});
