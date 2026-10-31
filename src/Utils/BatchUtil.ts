import type { BatchOutcome, BatchResultOptions } from "@/Protocols/ListProtocol.ts";
import type { OperationResult } from "@/Protocols/OperationProtocol.ts";

export class BatchUtil {
  static async run(items: readonly string[], apply: (item: string) => Promise<void>): Promise<BatchOutcome> {
    const applied: string[] = [];
    for (const item of items) {
      try {
        await apply(item);
        applied.push(item);
      } catch (error) {
        const failureMessage = error instanceof Error ? error.message : "unknown error";
        return { applied, failureMessage, notApplied: items.slice(applied.length) };
      }
    }
    return { applied, notApplied: [] };
  }

  static buildResult(options: BatchResultOptions): OperationResult {
    const { pastVerb, noun, outcome } = options;
    const data = { applied: outcome.applied, notApplied: outcome.notApplied, failure: outcome.failureMessage };
    if (outcome.failureMessage === undefined) {
      return { summary: `${pastVerb} ${outcome.applied.length} ${noun}.`, data };
    }
    return {
      isError: true,
      summary: `${pastVerb} ${outcome.applied.length} ${noun} and then stopped at ${outcome.notApplied[0] ?? "the next one"}: `
        + `${outcome.failureMessage} ${outcome.notApplied.length} were not applied and none after the failure ran. `
        + "CapRover has no transactions, so what was applied stays applied.",
      data,
    };
  }
}
