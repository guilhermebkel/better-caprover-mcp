import { CliRunner } from "@/Server/CliRunner.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";

const FIRST_ARGUMENT_INDEX = 2;

try {
  await CliRunner.run(process.argv.slice(FIRST_ARGUMENT_INDEX));
} catch (error) {
  LogUtil.logError("startup_failed", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
}
