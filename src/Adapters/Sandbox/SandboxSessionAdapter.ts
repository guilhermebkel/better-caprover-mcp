import type { QuickJSContext, QuickJSDeferredPromise, QuickJSRuntime } from "quickjs-emscripten";
import type { SandboxFailure, SandboxLimits } from "@/Protocols/SandboxProtocol.ts";

export class SandboxSessionAdapter {
  readonly vm: QuickJSContext;

  readonly logs: string[] = [];

  readonly pending = new Set<QuickJSDeferredPromise>();

  logChars = 0;

  hostCalls = 0;

  wake: (() => void) | undefined;

  failure: SandboxFailure | undefined;

  constructor(
    readonly runtime: QuickJSRuntime,
    readonly limits: SandboxLimits,
  ) {
    this.vm = runtime.newContext();
  }

  close(): void {
    try {
      for (const deferred of this.pending) {
        deferred.dispose();
      }
      this.pending.clear();
      this.vm.dispose();
      this.runtime.dispose();
    } catch {
      // Why: an engine that hit its memory limit can fail while it is disposed; the run is over either way.
    }
  }
}
