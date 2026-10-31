import variant from "@jitl/quickjs-singlefile-cjs-release-sync";
import {
  newQuickJSWASMModuleFromVariant,
  type JSPromiseState,
  type QuickJSHandle,
  type QuickJSWASMModule,
} from "quickjs-emscripten";
import { SandboxSessionAdapter } from "@/Adapters/Sandbox/SandboxSessionAdapter.ts";
import type {
  SandboxFailure,
  SandboxLimit,
  SandboxLimits,
  SandboxMeasure,
  SandboxPort,
  SandboxResult,
  SandboxRun,
} from "@/Protocols/SandboxProtocol.ts";

const MEGABYTE = 1_048_576;
const KILOBYTE = 1024;
const DEFAULT_MEMORY_MEGABYTES = 32;
const DEFAULT_STACK_KILOBYTES = 256;
const MAX_ERROR_CHARS = 500;
const SCRIPT_FILE = "script.js";
const LINE_IN_STACK = new RegExp(`${SCRIPT_FILE}:(\\d+)`);
const SANDBOX_START_FAILURE = "The sandbox could not start.";

export const DEFAULT_SANDBOX_LIMITS: SandboxLimits = {
  cpuMs: 10_000,
  wallMs: 300_000,
  memoryBytes: DEFAULT_MEMORY_MEGABYTES * MEGABYTE,
  stackBytes: DEFAULT_STACK_KILOBYTES * KILOBYTE,
  maxHostCalls: 50,
  maxOutputChars: 20_000,
  maxLogChars: 4000,
};

export class QuickJsSandboxAdapter implements SandboxPort {
  private static modulePromise: Promise<QuickJSWASMModule> | undefined;

  constructor(private readonly limits: SandboxLimits = DEFAULT_SANDBOX_LIMITS) {}

  private static loadModule(): Promise<QuickJSWASMModule> {
    QuickJsSandboxAdapter.modulePromise ??= newQuickJSWASMModuleFromVariant(variant);
    return QuickJsSandboxAdapter.modulePromise;
  }

  async run(request: SandboxRun): Promise<SandboxResult> {
    const wasm = await QuickJsSandboxAdapter.loadModule();
    const session = new SandboxSessionAdapter(wasm.newRuntime(), this.limits);
    try {
      return await QuickJsSandboxAdapter.runSession(session, request);
    } finally {
      session.close();
    }
  }

  private static async runSession(session: SandboxSessionAdapter, request: SandboxRun): Promise<SandboxResult> {
    const { runtime, vm, limits } = session;
    runtime.setMemoryLimit(limits.memoryBytes);
    runtime.setMaxStackSize(limits.stackBytes);
    let segmentStartMs = 0;
    let usedMs = 0;
    runtime.setInterruptHandler(() => {
      const isOver = usedMs + (Date.now() - segmentStartMs) > limits.cpuMs;
      if (isOver) {
        session.failure ??= { message: `The script used more than ${limits.cpuMs} ms of computing time.`, limit: "time" };
      }
      return isOver;
    });
    const measure: SandboxMeasure = (work) => {
      segmentStartMs = Date.now();
      try {
        return work();
      } finally {
        usedMs += Date.now() - segmentStartMs;
      }
    };
    QuickJsSandboxAdapter.addHostFunctions(session, request);
    const prelude = measure(() => vm.evalCode(QuickJsSandboxAdapter.buildPrelude(request.apiNames), "prelude.js"));
    if (prelude.error) {
      prelude.error.dispose();
      return QuickJsSandboxAdapter.buildResult(session, false, "", { message: SANDBOX_START_FAILURE });
    }
    prelude.value.dispose();
    const wrapped = `(async () => {${request.script}\n})().then((value) => (value === undefined ? "null" : JSON.stringify(value) ?? "null"))`;
    const started = measure(() => vm.evalCode(wrapped, SCRIPT_FILE));
    if (started.error) {
      return QuickJsSandboxAdapter.buildResult(session, false, "", QuickJsSandboxAdapter.readFailure(session, started.error));
    }
    try {
      return await QuickJsSandboxAdapter.waitForPromise(session, started.value, measure);
    } finally {
      started.value.dispose();
    }
  }

  private static async waitForPromise(
    session: SandboxSessionAdapter,
    promise: QuickJSHandle,
    measure: SandboxMeasure,
  ): Promise<SandboxResult> {
    const { runtime, vm, limits } = session;
    const wallDeadlineMs = Date.now() + limits.wallMs;
    for (;;) {
      const jobs = measure(() => runtime.executePendingJobs());
      if (jobs.error) {
        return QuickJsSandboxAdapter.buildResult(session, false, "", QuickJsSandboxAdapter.readFailure(session, jobs.error));
      }
      const settled = QuickJsSandboxAdapter.readSettled(session, vm.getPromiseState(promise));
      if (settled !== undefined) {
        return settled;
      }
      if (session.pending.size === 0 && !runtime.hasPendingJob()) {
        return QuickJsSandboxAdapter.buildResult(session, false, "", { message: "The script ended without returning a value." });
      }
      const remainingMs = wallDeadlineMs - Date.now();
      const hasWoken = remainingMs > 0 && await QuickJsSandboxAdapter.waitForHost(session, remainingMs);
      if (!hasWoken) {
        const message = `The script ran longer than ${limits.wallMs} ms in total, host calls included.`;
        return QuickJsSandboxAdapter.buildResult(session, false, "", { message, limit: "time" });
      }
    }
  }

  private static readSettled(session: SandboxSessionAdapter, state: JSPromiseState): SandboxResult | undefined {
    if (state.type === "pending") {
      return undefined;
    }
    return QuickJsSandboxAdapter.readDone(session, state);
  }

  private static readDone(session: SandboxSessionAdapter, state: JSPromiseState): SandboxResult {
    if ("value" in state) {
      const output = session.vm.getString(state.value);
      state.value.dispose();
      return QuickJsSandboxAdapter.buildResult(session, true, output);
    }
    const failure = "error" in state && !(state.error instanceof Error)
      ? QuickJsSandboxAdapter.readFailure(session, state.error)
      : { message: "The script ended without a result." };
    return QuickJsSandboxAdapter.buildResult(session, false, "", failure);
  }

  private static waitForHost(session: SandboxSessionAdapter, timeoutMs: number): Promise<boolean> {
    if (session.pending.size === 0) {
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        session.wake = undefined;
        resolve(false);
      }, timeoutMs);
      session.wake = () => {
        clearTimeout(timer);
        session.wake = undefined;
        resolve(true);
      };
    });
  }

  private static addHostFunctions(session: SandboxSessionAdapter, request: SandboxRun): void {
    const { vm, limits } = session;
    const callFunction = vm.newFunction("__call", (nameHandle, argsHandle) => {
      session.hostCalls += 1;
      if (session.hostCalls > limits.maxHostCalls) {
        const message = `The script made more than ${limits.maxHostCalls} calls to caprover.*.`;
        session.failure ??= { message, limit: "calls" };
        throw new Error(message);
      }
      const deferred = vm.newPromise();
      session.pending.add(deferred);
      const settle = (work: () => void): void => {
        session.pending.delete(deferred);
        if (vm.alive) {
          work();
        }
        deferred.dispose();
        session.wake?.();
      };
      const apiName = vm.getString(nameHandle);
      const argsText = vm.getString(argsHandle);
      QuickJsSandboxAdapter.callHost(request, apiName, argsText).then(
        (text) => {
          settle(() => {
            const value = vm.newString(text);
            deferred.resolve(value);
          });
        },
        (error: unknown) => {
          settle(() => {
            const problem = vm.newError(QuickJsSandboxAdapter.readErrorMessage(error));
            deferred.reject(problem);
          });
        },
      );
      return deferred.handle;
    });
    vm.setProp(vm.global, "__call", callFunction);
    callFunction.dispose();
    const logFunction = vm.newFunction("__log", (textHandle) => {
      const text = vm.getString(textHandle);
      const room = limits.maxLogChars - session.logChars;
      if (room > 0) {
        session.logs.push(text.slice(0, room));
        session.logChars += text.length;
      }
    });
    vm.setProp(vm.global, "__log", logFunction);
    logFunction.dispose();
  }

  private static async callHost(request: SandboxRun, apiName: string, argsText: string): Promise<string> {
    const args: unknown = argsText === "" ? {} : JSON.parse(argsText);
    const result = await request.hostCall(apiName, args);
    return JSON.stringify(result ?? null);
  }

  private static buildPrelude(apiNames: readonly string[]): string {
    return `
      const __api = ${JSON.stringify(apiNames)};
      const __callHost = globalThis.__call;
      const __logHost = globalThis.__log;
      delete globalThis.__call;
      delete globalThis.__log;
      const caprover = Object.create(null);
      for (const name of __api) {
        const parts = name.split(".");
        let node = caprover;
        for (const part of parts.slice(0, -1)) {
          node[part] ??= Object.create(null);
          node = node[part];
        }
        node[parts[parts.length - 1]] = (args) => __callHost(name, JSON.stringify(args ?? {})).then((text) => JSON.parse(text));
      }
      const __freeze = (node) => {
        for (const key of Object.keys(node)) {
          if (typeof node[key] === "object") {
            __freeze(node[key]);
          }
        }
        Object.freeze(node);
      };
      __freeze(caprover);
      const __format = (value) => (typeof value === "string" ? value : (() => { try { return JSON.stringify(value) ?? String(value); } catch { return String(value); } })());
      globalThis.console = Object.freeze({
        log: (...values) => __logHost(values.map(__format).join(" ")),
        info: (...values) => __logHost(values.map(__format).join(" ")),
        warn: (...values) => __logHost("warn: " + values.map(__format).join(" ")),
        error: (...values) => __logHost("error: " + values.map(__format).join(" ")),
      });
      globalThis.caprover = caprover;
    `;
  }

  private static buildResult(
    session: SandboxSessionAdapter,
    isOk: boolean,
    output: string,
    failure?: SandboxFailure,
  ): SandboxResult {
    const { limits } = session;
    const isTruncated = output.length > limits.maxOutputChars;
    const result: SandboxResult = {
      isOk,
      isTruncated,
      output: isTruncated ? output.slice(0, limits.maxOutputChars) : output,
      logs: session.logs,
      hostCalls: session.hostCalls,
    };
    if (failure !== undefined) {
      const known = session.failure ?? failure;
      result.error = known.message.slice(0, MAX_ERROR_CHARS);
      result.line = known.line ?? failure.line;
      result.limit = known.limit ?? failure.limit;
    }
    return result;
  }

  private static readFailure(session: SandboxSessionAdapter, errorHandle: QuickJSHandle): SandboxFailure {
    const dumped: unknown = session.vm.dump(errorHandle);
    errorHandle.dispose();
    const fields = typeof dumped === "object" && dumped !== null ? Object.fromEntries(Object.entries(dumped)) : {};
    const fallback = typeof dumped === "string" ? dumped : "The script threw a value.";
    const message = typeof fields.message === "string" ? fields.message : fallback;
    const stack = typeof fields.stack === "string" ? fields.stack : "";
    const failure: SandboxFailure = { message };
    const lineText = LINE_IN_STACK.exec(stack)?.[1];
    if (lineText !== undefined) {
      failure.line = Number.parseInt(lineText, 10);
    }
    const limit = QuickJsSandboxAdapter.classifyLimit(message);
    if (limit !== undefined) {
      failure.limit = limit;
    }
    return failure;
  }

  private static classifyLimit(message: string): SandboxLimit | undefined {
    const text = message.toLowerCase();
    if (text.includes("out of memory")) {
      return "memory";
    }
    if (text.includes("stack overflow") || text.includes("call stack")) {
      return "stack";
    }
    return undefined;
  }

  private static readErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "The call failed.";
  }
}
