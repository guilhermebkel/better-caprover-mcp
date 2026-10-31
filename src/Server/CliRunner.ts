import { UnknownCommandError } from "@/Errors/UnknownCommandError.ts";
import { InitRunner } from "@/Server/InitRunner.ts";
import { StdioRunner } from "@/Server/StdioRunner.ts";

export class CliRunner {
  static async run(args: readonly string[]): Promise<void> {
    const [command] = args;
    if (command === undefined) {
      return StdioRunner.run();
    }
    if (command === "init") {
      return InitRunner.run();
    }
    throw new UnknownCommandError(command);
  }
}
