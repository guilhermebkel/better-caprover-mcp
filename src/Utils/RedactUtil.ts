export class RedactUtil {
  static readonly REDACTED = "[REDACTED]";

  static readonly MIN_VALUE_LENGTH = 8;

  static selectSecrets(values: readonly string[]): string[] {
    // Why: a short value such as "3000" or "true" would be hidden everywhere in a log and make it unreadable.
    return values.filter((value) => value.length >= RedactUtil.MIN_VALUE_LENGTH);
  }

  static redactText(text: string, secrets: readonly string[]): string {
    const longestFirst = secrets.filter((secret) => secret !== "").toSorted((first, second) => second.length - first.length);
    return longestFirst.reduce((redacted, secret) => redacted.split(secret).join(RedactUtil.REDACTED), text);
  }

  static redactValue(value: unknown, secrets: readonly string[]): unknown {
    if (typeof value === "string") {
      return RedactUtil.redactText(value, secrets);
    }
    if (Array.isArray(value)) {
      return value.map((item: unknown) => RedactUtil.redactValue(item, secrets));
    }
    if (typeof value === "object" && value !== null) {
      const entries = Object.entries(value).map(([key, item]) => [key, RedactUtil.redactValue(item, secrets)] as const);
      return Object.fromEntries(entries);
    }
    return value;
  }
}
