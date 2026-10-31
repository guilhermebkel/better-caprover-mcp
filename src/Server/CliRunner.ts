import type { CliCommand } from "@/Protocols/CliProtocol.ts";
import { UnknownCommandError } from "@/Errors/UnknownCommandError.ts";
import { HealthRunner } from "@/Server/HealthRunner.ts";
import { InitRunner } from "@/Server/InitRunner.ts";
import { ServeRunner } from "@/Server/ServeRunner.ts";
import { StdioRunner } from "@/Server/StdioRunner.ts";

const COMMAND_TO_RUNNER: Record<CliCommand, (args: readonly string[]) => Promise<void>> = {
  init: () => InitRunner.run(),
  serve: (args) => ServeRunner.run(args),
  health: () => HealthRunner.run(),
};

export class CliRunner {
  static async run(args: readonly string[]): Promise<void> {
    const [command, ...rest] = args;
    if (command === undefined) {
      return StdioRunner.run();
    }
    const runner = Object.hasOwn(COMMAND_TO_RUNNER, command) ? COMMAND_TO_RUNNER[command as CliCommand] : undefined;
    if (runner === undefined) {
      throw new UnknownCommandError(command);
    }
    return runner(rest);
  }
}
