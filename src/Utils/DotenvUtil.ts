import { InvalidDotenvError } from "@/Errors/InvalidDotenvError.ts";
import type { CaproverEnvVar } from "@/Protocols/CaproverClientProtocol.ts";

const KEY_PATTERN = /^[A-Za-z_]\w*$/;
const DOUBLE_QUOTE = "\"";
const SINGLE_QUOTE = "'";
const MIN_QUOTED_LENGTH = 2;
const LINE_START_LENGTH = 24;

export class DotenvUtil {
  static parse(text: string): CaproverEnvVar[] {
    const envVars: CaproverEnvVar[] = [];
    text.split(/\r?\n/).forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (line === "" || line.startsWith("#")) {
        return;
      }
      envVars.push(DotenvUtil.parseLine(line, index + 1));
    });
    return envVars;
  }

  private static parseLine(line: string, lineNumber: number): CaproverEnvVar {
    const withoutExport = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const separatorIndex = withoutExport.indexOf("=");
    // Why: only the key part of a bad line is quoted back, because a line without "=" can be a bare secret.
    const lineStart = withoutExport.split(/[\s=]/)[0]?.slice(0, LINE_START_LENGTH) ?? "";
    if (separatorIndex < 1) {
      throw new InvalidDotenvError(lineNumber, "expected KEY=value.", lineStart);
    }
    const key = withoutExport.slice(0, separatorIndex).trim();
    if (!KEY_PATTERN.test(key)) {
      throw new InvalidDotenvError(lineNumber, "the key may have only letters, digits and underscores.", lineStart);
    }
    return { key, value: DotenvUtil.stripQuotes(withoutExport.slice(separatorIndex + 1).trim()) };
  }

  private static stripQuotes(value: string): string {
    const first = value.charAt(0);
    const isQuote = first === DOUBLE_QUOTE || first === SINGLE_QUOTE;
    const isQuoted = value.length >= MIN_QUOTED_LENGTH && isQuote && value.endsWith(first);
    return isQuoted ? value.slice(1, -1) : value;
  }
}
