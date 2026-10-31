import { describe, expect, it } from "vitest";
import { buildRequestLines, checkReplies, parseCommand, parseLines } from "./package-smoke.mjs";

const GOOD_REPLY = {
  jsonrpc: "2.0",
  id: 1,
  result: { serverInfo: { name: "better-caprover-mcp" }, instructions: "Access mode: readonly. Enabled risk tiers: read." },
};

describe("buildRequestLines()", () => {
  it("sends initialize first and the initialized notification second", () => {
    const messages = buildRequestLines().map((line) => JSON.parse(line));

    expect(messages.map((message) => message.method)).toStrictEqual(["initialize", "notifications/initialized"]);
  });
});

describe("parseLines()", () => {
  it("parses one message per non-empty line", () => {
    expect(parseLines("{\"a\":1}\n\n{\"b\":2}\n")).toStrictEqual([{ a: 1 }, { b: 2 }]);
  });

  it("names the line that is not JSON", () => {
    expect(() => parseLines("hello\n")).toThrow("stdout carries a line that is not JSON: hello");
  });
});

describe("checkReplies()", () => {
  it("accepts the reply of a server in readonly mode", () => {
    expect(checkReplies([GOOD_REPLY])).toStrictEqual([]);
  });

  it("reports a server that answers with another name", () => {
    const reply = { ...GOOD_REPLY, result: { ...GOOD_REPLY.result, serverInfo: { name: "other" } } };

    expect(checkReplies([reply])).toStrictEqual(["serverInfo.name is \"other\", expected better-caprover-mcp"]);
  });

  it("reports a message that is not JSON-RPC", () => {
    expect(checkReplies([GOOD_REPLY, { hello: "world" }])).toStrictEqual(["a stdout line is not a JSON-RPC 2.0 message"]);
  });

  it("reports a missing reply to initialize", () => {
    expect(checkReplies([])).toStrictEqual(["expected one reply to initialize, got 0"]);
  });

  it("reports instructions that do not say readonly", () => {
    const reply = { ...GOOD_REPLY, result: { ...GOOD_REPLY.result, instructions: "Access mode: admin." } };

    expect(checkReplies([reply])).toStrictEqual(["the instructions do not say the server starts in readonly mode"]);
  });
});

describe("parseCommand()", () => {
  it("runs the local build when no command is given", () => {
    expect(parseCommand([])).toMatchObject({ command: ["node", "dist/main.js"], stdioOnly: false, httpOnly: false });
  });

  it("drops the leading -- and keeps the command", () => {
    expect(parseCommand(["--", "docker", "run", "-i"])).toMatchObject({ command: ["docker", "run", "-i"] });
  });

  it("records smoke mode flags", () => {
    expect(parseCommand(["--http-only", "--", "node", "dist/main.js"])).toMatchObject({ httpOnly: true, stdioOnly: false });
  });

  it("drops flags and the separator before the command", () => {
    expect(parseCommand(["--stdio-only", "--", "docker", "run", "-i"])).toMatchObject({
      command: ["docker", "run", "-i"],
      stdioOnly: true,
      httpOnly: false,
    });
  });
});
