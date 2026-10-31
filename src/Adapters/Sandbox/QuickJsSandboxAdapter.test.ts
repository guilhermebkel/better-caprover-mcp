import { afterEach, describe, expect, it, vi } from "vitest";
import type { SandboxHostCall, SandboxLimits, SandboxResult } from "@/Protocols/SandboxProtocol.ts";
import { DEFAULT_SANDBOX_LIMITS, QuickJsSandboxAdapter } from "@/Adapters/Sandbox/QuickJsSandboxAdapter.ts";

const TEST_LIMITS: SandboxLimits = {
  ...DEFAULT_SANDBOX_LIMITS,
  cpuMs: 300,
  wallMs: 5000,
  maxHostCalls: 5,
  maxOutputChars: 100,
  maxLogChars: 50,
};

const API_NAMES = ["apps.list", "apps.remove"];
const UNDEFINED_TEXT = "\"undefined\"";

const runScript = (
  script: string,
  callHost: SandboxHostCall = () => Promise.resolve(null),
  limits: Partial<SandboxLimits> = {},
): Promise<SandboxResult> => (
  new QuickJsSandboxAdapter({ ...TEST_LIMITS, ...limits }).run({ apiNames: API_NAMES, hostCall: callHost, script })
);

describe("QuickJsSandboxAdapter.run()", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("when a script returns a value", () => {
    it("returns the value as JSON text", async () => {
      const result = await runScript("return { sum: 1 + 2, list: [1, 'a'] };");

      expect(result).toStrictEqual({
        isOk: true,
        isTruncated: false,
        output: "{\"sum\":3,\"list\":[1,\"a\"]}",
        logs: [],
        hostCalls: 0,
      });
    });

    it("returns null when the script returns nothing", async () => {
      const result = await runScript("const unused = 1;");

      expect(result.output).toBe("null");
    });
  });

  describe("when a script calls caprover.*", () => {
    it("passes the name and the arguments to the host and returns its answer", async () => {
      const callHost = vi.fn<SandboxHostCall>(() => Promise.resolve({ apps: ["web", "api"] }));

      const result = await runScript("const reply = await caprover.apps.list({ filter: 'w' }); return reply.apps.length;", callHost);

      expect(callHost).toHaveBeenCalledExactlyOnceWith("apps.list", { filter: "w" });
      expect(result.output).toBe("2");
      expect(result.hostCalls).toBe(1);
    });

    it("lets the script catch the error the host call raised", async () => {
      const callHost: SandboxHostCall = () => Promise.reject(new Error("denied by the mode"));

      const result = await runScript("try { await caprover.apps.remove({}); } catch (error) { return error.message; }", callHost);

      expect(result.output).toBe("\"denied by the mode\"");
    });

    it("runs calls started together", async () => {
      const callHost: SandboxHostCall = (name) => Promise.resolve(name);

      const result = await runScript("return await Promise.all([caprover.apps.list(), caprover.apps.remove()]);", callHost);

      expect(result.output).toBe("[\"apps.list\",\"apps.remove\"]");
    });
  });

  describe("when a script logs", () => {
    it("returns the lines and cuts them at the log limit", async () => {
      const result = await runScript("console.log('first', { a: 1 }); console.log('x'.repeat(100)); console.log('late');");

      expect(result.logs).toStrictEqual(["first {\"a\":1}", "x".repeat(37)]);
    });
  });

  describe("when a script fails", () => {
    it("says the line and the message of the error", async () => {
      const result = await runScript("const a = 1;\nconst b = 2;\nthrow new Error('boom ' + (a + b));");

      expect(result).toMatchObject({ isOk: false, error: "boom 3", line: 3 });
    });

    it("says the line of a syntax error", async () => {
      const result = await runScript("const a = ;");

      expect(result.isOk).toBe(false);
      expect(result.line).toBe(1);
    });
  });

  describe("when a script hits a limit", () => {
    it("ends an endless loop at the time limit and names it", async () => {
      const result = await runScript("while (true) {}");

      expect(result).toMatchObject({ isOk: false, limit: "time", error: "The script used more than 300 ms of computing time." });
    });

    it("ends an unbounded allocation at the memory limit and names it", async () => {
      const result = await runScript("const keep = []; while (true) { keep.push({ index: keep.length, pad: [1, 2, 3, 4] }); }", undefined, { cpuMs: 5000 });

      expect(result).toMatchObject({ isOk: false, limit: "memory" });
    });

    it("ends a very large single allocation at the memory limit", async () => {
      const result = await runScript("return 'x'.repeat(2 ** 28).length;");

      expect(result).toMatchObject({ isOk: false, limit: "memory" });
    });

    it("ends endless recursion at the stack limit and names it", async () => {
      const result = await runScript("const dive = (depth) => dive(depth + 1) + 1; return dive(0);");

      expect(result).toMatchObject({ isOk: false, limit: "stack" });
    });

    it("stops the host calls after the call limit and names it", async () => {
      const callHost = vi.fn<SandboxHostCall>(() => Promise.resolve(1));

      const result = await runScript("for (let index = 0; index < 100; index += 1) { await caprover.apps.list(); }", callHost);

      expect(result).toMatchObject({ isOk: false, limit: "calls", hostCalls: 6 });
      expect(callHost).toHaveBeenCalledTimes(5);
    });

    it("ends a script that waits longer than the total time and names the time limit", async () => {
      const waitForever: SandboxHostCall = () => new Promise<unknown>(() => undefined);

      const result = await runScript("await caprover.apps.list();", waitForever, { wallMs: 100 });

      expect(result).toMatchObject({ isOk: false, limit: "time" });
    });

    it("does not count the wait for a host call as computing time", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const waitThenAnswer: SandboxHostCall = () => {
        vi.setSystemTime(Date.now() + 1000);
        return Promise.resolve("done");
      };

      const result = await runScript("return await caprover.apps.list();", waitThenAnswer);

      expect(result).toMatchObject({ isOk: true, output: "\"done\"" });
    });

    it("cuts a huge output and says it is cut", async () => {
      const result = await runScript("return 'y'.repeat(5000);");

      expect(result.isTruncated).toBe(true);
      expect(result.output).toBe(`"${"y".repeat(99)}`);
    });
  });

  describe("when a script tries to reach the host", () => {
    it.each([
      ["process", "return typeof process;", UNDEFINED_TEXT],
      ["require", "return typeof require;", UNDEFINED_TEXT],
      ["fetch", "return typeof fetch;", UNDEFINED_TEXT],
      ["a timer", "return typeof setTimeout + typeof setInterval + typeof setImmediate;", "\"undefinedundefinedundefined\""],
      ["Buffer", "return typeof Buffer;", UNDEFINED_TEXT],
      ["the host call functions", "return typeof __call + typeof __log;", "\"undefinedundefined\""],
      ["WebAssembly", "return typeof WebAssembly;", UNDEFINED_TEXT],
    ])("finds no %s", async (_name, script, expected) => {
      const result = await runScript(script);

      expect(result.output).toBe(expected);
    });

    it.each([
      ["calling process", "return process.env.HOME;"],
      ["calling require", "return require('fs').readFileSync('/etc/passwd', 'utf8');"],
      ["calling fetch", "return await fetch('http://127.0.0.1:1/');"],
      ["a dynamic import of a node module", "return await import('node:fs');"],
      ["a dynamic import of a file", "return await import('./secret.js');"],
      ["the function constructor", "return (new Function('return process'))().env;"],
      ["the constructor chain of globalThis", "return globalThis.constructor.constructor('return process')().env;"],
      ["the constructor chain of a host function", "return caprover.apps.list.constructor('return process')().env;"],
      ["a timer", "setTimeout(() => {}, 0);"],
    ])("fails when it tries %s", async (_name, script) => {
      const result = await runScript(script);

      expect(result.isOk).toBe(false);
    });

    it("cannot replace caprover.*", async () => {
      const callHost = vi.fn<SandboxHostCall>(() => Promise.resolve("real"));

      const result = await runScript("'use strict'; caprover.apps.list = () => 'fake'; return await caprover.apps.list();", callHost);

      expect(result.isOk).toBe(false);
      expect(callHost).not.toHaveBeenCalled();
    });

    it("cannot call a name the host did not list", async () => {
      const callHost = vi.fn<SandboxHostCall>(() => Promise.resolve("real"));

      const result = await runScript("return await caprover.apps.destroy();", callHost);

      expect(result.isOk).toBe(false);
      expect(callHost).not.toHaveBeenCalled();
    });

    it("keeps prototype pollution inside its own sandbox", async () => {
      const first = await runScript("Object.prototype.polluted = 'yes'; return ({}).polluted;");
      const second = await runScript("return ({}).polluted ?? 'clean';");

      expect(first.output).toBe("\"yes\"");
      expect(second.output).toBe("\"clean\"");
      expect(Reflect.get({}, "polluted")).toBeUndefined();
    });
  });
});
