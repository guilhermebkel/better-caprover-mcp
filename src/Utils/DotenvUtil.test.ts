import { describe, expect, it } from "vitest";
import { InvalidDotenvError } from "@/Errors/InvalidDotenvError.ts";
import { DotenvUtil } from "@/Utils/DotenvUtil.ts";

describe("DotenvUtil.parse()", () => {
  it("reads one variable per line and skips blank lines and comments", () => {
    const text = "# database\nDB_HOST=db.local\n\nDB_PORT=5432\r\n";

    expect(DotenvUtil.parse(text)).toStrictEqual([
      { key: "DB_HOST", value: "db.local" },
      { key: "DB_PORT", value: "5432" },
    ]);
  });

  it("keeps an equals sign inside the value", () => {
    expect(DotenvUtil.parse("URL=https://x.test/?a=b")).toStrictEqual([{ key: "URL", value: "https://x.test/?a=b" }]);
  });

  it("removes one pair of matching quotes", () => {
    expect(DotenvUtil.parse("A=\"two words\"\nB='single'")).toStrictEqual([
      { key: "A", value: "two words" },
      { key: "B", value: "single" },
    ]);
  });

  it("accepts an export prefix", () => {
    expect(DotenvUtil.parse("export MODE=prod")).toStrictEqual([{ key: "MODE", value: "prod" }]);
  });

  it("keeps an empty value", () => {
    expect(DotenvUtil.parse("EMPTY=")).toStrictEqual([{ key: "EMPTY", value: "" }]);
  });

  it("names the line number of a line without an equals sign", () => {
    expect(() => DotenvUtil.parse("OK=1\nthis-has-no-separator")).toThrow(/line 2: expected KEY=value/);
  });

  it("refuses a key with a dash", () => {
    expect(() => DotenvUtil.parse("BAD-KEY=1")).toThrow(InvalidDotenvError);
  });

  it("does not quote the secret that follows a bad key", () => {
    expect(() => DotenvUtil.parse("bad key=supersecretvalue")).toThrow(/starts with "bad"\./);
    expect(() => DotenvUtil.parse("bad key=supersecretvalue")).not.toThrow(/supersecretvalue/);
  });
});
