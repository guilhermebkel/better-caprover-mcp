import { UnknownCommandError } from "@/Errors/UnknownCommandError.ts";
import { HttpRunner } from "@/Server/HttpRunner.ts";

export class ServeRunner {
  static async run(args: readonly string[]): Promise<void> {
    const [flag] = args;
    if (flag !== "--http") {
      throw new UnknownCommandError(`serve ${flag ?? ""}`.trim());
    }
    return HttpRunner.run();
  }
}
