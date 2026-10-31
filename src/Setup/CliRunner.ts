import type { CliCommand } from "@/Protocols/CliProtocol.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { UnknownCommandError } from "@/Errors/UnknownCommandError.ts";
import { HealthRunner } from "@/Setup/HealthRunner.ts";
import { HttpRunner } from "@/Setup/HttpRunner.ts";
import { InitRunner } from "@/Setup/InitRunner.ts";
import { ServeRunner } from "@/Setup/ServeRunner.ts";
import { StdioRunner } from "@/Setup/StdioRunner.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";

const COMMAND_TO_RUNNER: Record<CliCommand, (args: readonly string[]) => Promise<void>> = {
  init: () => InitRunner.run(),
  serve: (args) => ServeRunner.run(args),
  health: () => HealthRunner.run(),
};

const TRANSPORT_TO_RUNNER: Record<Env["CAPROVER_MCP_TRANSPORT"], () => Promise<void>> = {
  stdio: () => StdioRunner.run(),
  http: () => HttpRunner.run(),
};

export class CliRunner {
  static async run(args: readonly string[]): Promise<void> {
    const [command, ...rest] = args;
    if (command === undefined) {
      return CliRunner.runDefault();
    }
    const runner = Object.hasOwn(COMMAND_TO_RUNNER, command) ? COMMAND_TO_RUNNER[command as CliCommand] : undefined;
    if (runner === undefined) {
      throw new UnknownCommandError(command);
    }
    return runner(rest);
  }

  private static runDefault(): Promise<void> {
    return TRANSPORT_TO_RUNNER[EnvUtil.read().CAPROVER_MCP_TRANSPORT]();
  }
}
