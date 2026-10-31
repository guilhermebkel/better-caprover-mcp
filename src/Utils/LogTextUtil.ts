import type { LogTail } from "@/Protocols/LogTextProtocol.ts";
import { RedactUtil } from "@/Utils/RedactUtil.ts";

const FIRST_PRINTABLE_CODE = 32;
const DELETE_CODE = 127;
const NEWLINE = "\n";
const TAB = "\t";

export class LogTextUtil {
  static buildTail(text: string, maxLines: number, secrets: readonly string[]): LogTail {
    const clean = LogTextUtil.stripControlCharacters(text);
    const allLines = clean.split(NEWLINE).filter((line) => line.trim() !== "");
    const lines = allLines.slice(-maxLines).map((line) => RedactUtil.redactText(line, secrets));
    return { lines, totalLines: allLines.length, isTruncated: allLines.length > maxLines };
  }

  static buildTailFromLines(allLines: readonly string[], maxLines: number, secrets: readonly string[]): LogTail {
    return LogTextUtil.buildTail(allLines.join(NEWLINE), maxLines, secrets);
  }

  private static stripControlCharacters(text: string): string {
    // Why: Docker log streams carry binary frame headers and CR characters that are noise for the model.
    return Array.from(text.replaceAll("\r\n", NEWLINE))
      .filter((character) => {
        const code = character.charCodeAt(0);
        return character === NEWLINE || character === TAB || (code >= FIRST_PRINTABLE_CODE && code !== DELETE_CODE);
      })
      .join("");
  }
}
