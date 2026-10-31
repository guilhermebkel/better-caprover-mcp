import type { AppDiagnosis, Finding, FindingSeverity } from "@/Protocols/DiagnosisProtocol.ts";

const SEVERITY_ORDER: readonly FindingSeverity[] = ["error", "warning", "info"];

export class FindingSummaryUtil {
  static buildAppSummary(appName: string, diagnosis: AppDiagnosis): string {
    const { findings, rulesRun, rulesSkipped } = diagnosis;
    const head = findings.length === 0
      ? `Diagnosis of ${appName}: no finding was produced by the rules. Rules that ran: ${rulesRun.join(", ")}.`
      : `Diagnosis of ${appName}: ${FindingSummaryUtil.countBySeverity(findings)}.`;
    if (rulesSkipped.length === 0) {
      return head;
    }
    const skipped = rulesSkipped.map((rule) => rule.kind).join(", ");
    const reasons = [...new Set(rulesSkipped.map((rule) => rule.reason))].join(" ");
    return `${head} Rules skipped: ${skipped}. ${reasons}`;
  }

  static rankFindings(findings: readonly Finding[]): Finding[] {
    return findings.toSorted((first, second) =>
      SEVERITY_ORDER.indexOf(first.severity) - SEVERITY_ORDER.indexOf(second.severity)
      || (first.appName ?? "").localeCompare(second.appName ?? "")
      || first.kind.localeCompare(second.kind));
  }

  static countBySeverity(findings: readonly Finding[]): string {
    const parts = SEVERITY_ORDER.map((severity) => `${findings.filter((finding) => finding.severity === severity).length} ${severity}`);
    return `${findings.length} findings (${parts.join(", ")})`;
  }
}
