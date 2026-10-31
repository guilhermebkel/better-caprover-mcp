import { describe, expect, it } from "vitest";
import { UnknownCommandError } from "@/Errors/UnknownCommandError.ts";
import { CliRunner } from "@/Setup/CliRunner.ts";

describe("CliRunner.run()", () => {
  it("refuses a command it does not know and says which ones exist", async () => {
    await expect(CliRunner.run(["serve"])).rejects.toBeInstanceOf(UnknownCommandError);
    await expect(CliRunner.run(["serve"])).rejects.toThrow(
      "Unknown command \"serve\". Run without arguments to start the MCP server, or use \"init\" or \"serve --http\".",
    );
  });
});
