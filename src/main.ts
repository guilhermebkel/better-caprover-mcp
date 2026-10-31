import { StdioRunner } from "@/Server/StdioRunner.ts";
import { LogUtil } from "@/Utils/LogUtil.ts";

try {
  await StdioRunner.run();
} catch (error) {
  LogUtil.logError("startup_failed", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
}
