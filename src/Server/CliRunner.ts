import { UnknownCommandError } from "@/Errors/UnknownCommandError.ts";
import { InitRunner } from "@/Server/InitRunner.ts";
import { ServeRunner } from "@/Server/ServeRunner.ts";
import { StdioRunner } from "@/Server/StdioRunner.ts";

type CliCommand = "init" | "serve";

const COMMAND_TO_RUNNER: Record<CliCommand, (args: readonly string[]) => Promise<void>> = {
  init: () => InitRunner.run(),
  serve: (args) => ServeRunner.run(args),
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
