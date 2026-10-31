import type { ListInput, ListResultRequest } from "@/Protocols/ListProtocol.ts";
import type { OperationResult } from "@/Protocols/OperationProtocol.ts";

export class ListUtil {
  static readonly DEFAULT_LIMIT = 50;

  static buildResult<Field extends string>(request: ListResultRequest<Field>): OperationResult {
    const { noun, rows, input } = request;
    const text = input.filter?.toLowerCase();
    const matching = rows.filter((row) => text === undefined || ListUtil.readText(row).includes(text));
    const shown = matching.slice(0, input.limit ?? ListUtil.DEFAULT_LIMIT);
    const isTruncated = matching.length > shown.length;
    const items = shown.map((row) => ListUtil.pickFields(row, input));
    const missing = matching.length - shown.length;
    const nextStep = `${missing} more match. Raise \`limit\` (at most 200) or narrow \`filter\`.`;
    const suffix = isTruncated ? ` ${nextStep}` : "";
    const truncation = isTruncated ? { nextStep } : {};
    return {
      summary: `${matching.length} ${noun} match; showing ${shown.length}.${suffix}`,
      data: { [noun]: items, total: matching.length, isTruncated, ...truncation },
    };
  }

  private static readText(row: object): string {
    const parts = Object.values(row).flatMap((value: unknown) => {
      if (typeof value === "string") {
        return [value];
      }
      return Array.isArray(value) ? value.filter((item: unknown) => typeof item === "string") : [];
    });
    return parts.join(" ").toLowerCase();
  }

  private static pickFields<Field extends string>(row: object, input: ListInput<Field>): Record<string, unknown> {
    const entries = Object.entries(row);
    const wanted = input.fields;
    const isWanted = ([key]: [string, unknown]): boolean => wanted?.some((field) => field === key) ?? true;
    return Object.fromEntries(entries.filter(isWanted));
  }
}
