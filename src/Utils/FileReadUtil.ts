import { readFileSync } from "node:fs";

const TRAILING_NEWLINE = /\r?\n$/;

export class FileReadUtil {
  static readTrimmedText(path: string): string {
    const text = readFileSync(path, "utf8");
    return text.replace(TRAILING_NEWLINE, "");
  }
}
