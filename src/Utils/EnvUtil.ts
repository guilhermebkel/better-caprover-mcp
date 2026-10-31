import { z } from "zod";
import { InvalidEnvError } from "@/Errors/InvalidEnvError.ts";
import type { Env } from "@/Protocols/EnvProtocol.ts";
import { EnvSchema } from "@/Schemas/EnvSchema.ts";

export class EnvUtil {
  static read(): Env {
    const result = EnvSchema.safeParse(process.env);
    if (!result.success) {
      throw new InvalidEnvError(z.prettifyError(result.error));
    }
    return result.data;
  }
}
