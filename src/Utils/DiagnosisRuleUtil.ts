import type { CaproverTaskState } from "@/Protocols/CaproverClientProtocol.ts";
import type {
  AppDiagnosis,
  AppFacts,
  AppRule,
  DiskSeverityToFindingSeverity,
  FactNameToSkipReason,
  ListeningPort,
  MissingEnvName,
  Finding,
  ServerFacts,
  SkippedRule,
} from "@/Protocols/DiagnosisProtocol.ts";

const MAX_PORT = 65_535;
const LISTEN_WORDS = /\b(?:listening|listen|running|started|serving|server)\b/i;
const PORT_WORD = /\bport[\s:=]{0,3}(\d{2,5})\b/i;
const COLON_PORT = /:(\d{2,5})\b/;
const MISSING_WORDS = /\b(?:missing|not set|not defined|undefined|unset|required|not found)\b/i;
const ENV_WORD = /\benv/i;
const UNDERSCORE_NAME = /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/g;
const PROCESS_ENV_NAME = /\bprocess\.env\.([A-Za-z_]\w*)/g;
const NAMED_VARIABLE = /\benvironment variable\s+["'`]?([a-z_]\w*)/gi;

export class DiagnosisRuleUtil {
  static readonly REPEATED_RESTART_THRESHOLD = 3;

  static readonly MAX_BUILD_EVIDENCE_LINES = 20;

  static readonly MAX_LOG_EVIDENCE_LINES = 3;

  static readonly MAX_EVIDENCE_LINE_LENGTH = 300;

  static readonly MAX_LISTED_NAMES = 5;

  static readonly FAILED_TASK_STATES: readonly CaproverTaskState[] = ["failed", "rejected"];

  static readonly DISK_SEVERITY_TO_FINDING_SEVERITY: DiskSeverityToFindingSeverity = {
    normal: undefined,
    unknown: undefined,
    warning: "warning",
    critical: "error",
  };

  static readonly APP_RULES: readonly AppRule[] = [
    { kind: "instance_count_zero", needs: [], check: (facts) => DiagnosisRuleUtil.checkInstanceCountZero(facts) },
    { kind: "no_instances_running", needs: ["runtime"], check: (facts) => DiagnosisRuleUtil.checkNoInstancesRunning(facts) },
    { kind: "build_failed", needs: ["build"], check: (facts) => DiagnosisRuleUtil.checkBuildFailed(facts) },
    { kind: "build_stuck", needs: ["build"], check: (facts) => DiagnosisRuleUtil.checkBuildStuck(facts) },
    { kind: "repeated_restarts", needs: ["runtime"], check: (facts) => DiagnosisRuleUtil.checkRepeatedRestarts(facts) },
    { kind: "port_mismatch", needs: ["logs"], check: (facts) => DiagnosisRuleUtil.checkPortMismatch(facts) },
    { kind: "custom_domain_without_ssl", needs: [], check: (facts) => DiagnosisRuleUtil.checkCustomDomainWithoutSsl(facts) },
    {
      kind: "forced_ssl_without_default_ssl",
      needs: [],
      check: (facts) => DiagnosisRuleUtil.checkForcedSslWithoutDefaultSsl(facts),
    },
    { kind: "missing_env_var", needs: ["logs"], check: (facts) => DiagnosisRuleUtil.checkMissingEnvVar(facts) },
    { kind: "image_tag_latest", needs: [], check: (facts) => DiagnosisRuleUtil.checkImageTagLatest(facts) },
  ];

  static checkApp(facts: AppFacts, factNameToSkipReason: FactNameToSkipReason): AppDiagnosis {
    const findings: Finding[] = [];
    const rulesRun: AppDiagnosis["rulesRun"] = [];
    const rulesSkipped: SkippedRule[] = [];
    for (const rule of DiagnosisRuleUtil.APP_RULES) {
      const missing = rule.needs.find((fact) => factNameToSkipReason[fact] !== undefined);
      if (missing !== undefined) {
        rulesSkipped.push({ kind: rule.kind, reason: factNameToSkipReason[missing] ?? "A needed read is missing." });
        continue;
      }
      rulesRun.push(rule.kind);
      const finding = rule.check(facts);
      if (finding !== undefined) {
        findings.push(finding);
      }
    }
    return { findings, rulesRun, rulesSkipped };
  }

  static checkServer(facts: ServerFacts): Finding[] {
    return [
      ...DiagnosisRuleUtil.checkDiskLow(facts),
      ...DiagnosisRuleUtil.checkUnusedImages(facts),
      ...DiagnosisRuleUtil.checkRootDomainWithoutSsl(facts),
      ...DiagnosisRuleUtil.checkUpdateAvailable(facts),
    ];
  }

  static truncateLine(line: string): string {
    const max = DiagnosisRuleUtil.MAX_EVIDENCE_LINE_LENGTH;
    return line.length > max ? `${line.slice(0, max)}...` : line;
  }

  static findListeningPort(lines: readonly string[]): ListeningPort | undefined {
    const found = lines.flatMap((line) => {
      const port = DiagnosisRuleUtil.readListeningPort(line);
      return port === undefined ? [] : [{ port, line }];
    });
    return found.at(-1);
  }

  static findMissingEnvNames(lines: readonly string[]): MissingEnvName[] {
    const found = lines.flatMap((line) => DiagnosisRuleUtil.readMissingNames(line).map((name) => ({ name, line })));
    return found.filter((entry, index) => found.findIndex((other) => other.name === entry.name) === index);
  }

  static hasLatestTag(imageName: string): boolean {
    if (imageName.includes("@")) {
      return false;
    }
    const lastSegment = imageName.split("/").at(-1) ?? imageName;
    const tag = lastSegment.includes(":") ? lastSegment.split(":").at(-1) : undefined;
    return tag === undefined || tag === "latest";
  }

  private static readListeningPort(line: string): number | undefined {
    if (!LISTEN_WORDS.test(line)) {
      return undefined;
    }
    const byWord = PORT_WORD.exec(line)?.[1];
    const byColon = /\blistening\b/i.test(line) ? COLON_PORT.exec(line)?.[1] : undefined;
    const port = Number(byWord ?? byColon);
    return Number.isInteger(port) && port > 0 && port <= MAX_PORT ? port : undefined;
  }

  private static readMissingNames(line: string): string[] {
    if (!MISSING_WORDS.test(line) || !ENV_WORD.test(line)) {
      return [];
    }
    const underscored = line.match(UNDERSCORE_NAME) ?? [];
    const processEnv = [...line.matchAll(PROCESS_ENV_NAME)].map((match) => match[1] ?? "");
    const named = [...line.matchAll(NAMED_VARIABLE)].map((match) => match[1] ?? "");
    return [...new Set([...underscored, ...processEnv, ...named].filter((name) => name !== ""))];
  }

  private static checkInstanceCountZero(facts: AppFacts): Finding | undefined {
    const { app } = facts;
    if (app.instanceCount !== 0) {
      return undefined;
    }
    return {
      severity: "error",
      kind: "instance_count_zero",
      appName: app.appName,
      statement: `App ${app.appName} is set to 0 instances, so no container runs.`,
      evidence: ["instanceCount=0"],
    };
  }

  private static checkNoInstancesRunning(facts: AppFacts): Finding | undefined {
    const { app, runtime } = facts;
    const isStopped = runtime?.runningInstances === 0 && app.instanceCount > 0;
    if (runtime === undefined || !isStopped) {
      return undefined;
    }
    const failure = runtime.latestFailure === undefined ? [] : [`latestFailure: ${DiagnosisRuleUtil.truncateLine(runtime.latestFailure.error)}`];
    return {
      severity: "error",
      kind: "no_instances_running",
      appName: app.appName,
      statement: `App ${app.appName} should run ${app.instanceCount} instances and none runs.`,
      evidence: [
        `instanceCount=${app.instanceCount}`,
        `runningInstances=${runtime.runningInstances}`,
        `status=${runtime.status}`,
        ...failure,
      ],
    };
  }

  private static checkBuildFailed(facts: AppFacts): Finding | undefined {
    const { app, build } = facts;
    if (build?.isFailed !== true) {
      return undefined;
    }
    const tail = build.lines.slice(-DiagnosisRuleUtil.MAX_BUILD_EVIDENCE_LINES);
    return {
      severity: "error",
      kind: "build_failed",
      appName: app.appName,
      statement: `The latest build of app ${app.appName} failed.`,
      evidence: ["isBuildFailed=true", ...tail.map((line) => `build log: ${DiagnosisRuleUtil.truncateLine(line)}`)],
    };
  }

  private static checkBuildStuck(facts: AppFacts): Finding | undefined {
    const { app, build } = facts;
    if (build === undefined || !build.isBuilding || build.lines.length > 0) {
      return undefined;
    }
    return {
      severity: "warning",
      kind: "build_stuck",
      appName: app.appName,
      statement: `A build of app ${app.appName} is running and its build log has no lines.`,
      evidence: ["isBuilding=true", "build log lines=0"],
    };
  }

  private static checkRepeatedRestarts(facts: AppFacts): Finding | undefined {
    const { app, runtime } = facts;
    const failed = runtime?.tasks.filter((task) => DiagnosisRuleUtil.FAILED_TASK_STATES.includes(task.state)) ?? [];
    if (failed.length < DiagnosisRuleUtil.REPEATED_RESTART_THRESHOLD) {
      return undefined;
    }
    const reasons = failed.slice(0, DiagnosisRuleUtil.MAX_LOG_EVIDENCE_LINES).map((task) =>
      `task ${task.state}: ${DiagnosisRuleUtil.truncateLine(task.error ?? task.message)}`);
    return {
      severity: "error",
      kind: "repeated_restarts",
      appName: app.appName,
      statement: `Docker lists ${failed.length} failed or rejected tasks for app ${app.appName}.`,
      evidence: [`failedTasks=${failed.length}`, ...reasons],
    };
  }

  private static checkPortMismatch(facts: AppFacts): Finding | undefined {
    const { app, logLines } = facts;
    const expected = app.containerHttpPort;
    const listening = DiagnosisRuleUtil.findListeningPort(logLines ?? []);
    if (!app.isExposedAsWebApp || expected === undefined || listening === undefined || listening.port === expected) {
      return undefined;
    }
    return {
      severity: "error",
      kind: "port_mismatch",
      appName: app.appName,
      statement: `App ${app.appName} receives traffic on container port ${expected} and its logs say it listens on port ${listening.port}.`,
      evidence: [`containerHttpPort=${expected}`, `log: ${DiagnosisRuleUtil.truncateLine(listening.line)}`],
    };
  }

  private static checkCustomDomainWithoutSsl(facts: AppFacts): Finding | undefined {
    const { app } = facts;
    const plain = app.customDomains.filter((domain) => !domain.hasSsl);
    if (plain.length === 0) {
      return undefined;
    }
    return {
      severity: "warning",
      kind: "custom_domain_without_ssl",
      appName: app.appName,
      statement: `App ${app.appName} has ${plain.length} custom domains without SSL.`,
      evidence: plain.slice(0, DiagnosisRuleUtil.MAX_LISTED_NAMES).map((domain) => `customDomain ${domain.publicDomain} hasSsl=false`),
    };
  }

  private static checkForcedSslWithoutDefaultSsl(facts: AppFacts): Finding | undefined {
    const { app } = facts;
    if (!app.hasForcedSsl || app.hasDefaultDomainSsl) {
      return undefined;
    }
    return {
      severity: "error",
      kind: "forced_ssl_without_default_ssl",
      appName: app.appName,
      statement: `App ${app.appName} forces HTTPS and its default domain has no SSL.`,
      evidence: ["hasForcedSsl=true", "hasDefaultDomainSsl=false"],
    };
  }

  private static checkMissingEnvVar(facts: AppFacts): Finding | undefined {
    const { app, logLines } = facts;
    const keys = new Set(app.envVars.map((envVar) => envVar.key));
    const absent = DiagnosisRuleUtil.findMissingEnvNames(logLines ?? []).filter((entry) => !keys.has(entry.name));
    if (absent.length === 0) {
      return undefined;
    }
    const listed = absent.slice(0, DiagnosisRuleUtil.MAX_LISTED_NAMES);
    return {
      severity: "error",
      kind: "missing_env_var",
      appName: app.appName,
      statement: `The logs of app ${app.appName} name ${absent.length} env vars as missing, and the app has none of them.`,
      evidence: listed.flatMap((entry) => [`env var ${entry.name} is not in the app`, `log: ${DiagnosisRuleUtil.truncateLine(entry.line)}`]),
    };
  }

  private static checkImageTagLatest(facts: AppFacts): Finding | undefined {
    const { app } = facts;
    if (app.imageName === undefined || !DiagnosisRuleUtil.hasLatestTag(app.imageName)) {
      return undefined;
    }
    return {
      severity: "info",
      kind: "image_tag_latest",
      appName: app.appName,
      statement: `App ${app.appName} runs an image with the \`latest\` tag or no tag.`,
      evidence: [`imageName=${app.imageName}`],
    };
  }

  private static checkDiskLow(facts: ServerFacts): Finding[] {
    return (facts.disks ?? []).flatMap((node) => node.disks.flatMap((disk) => {
      const severity = DiagnosisRuleUtil.DISK_SEVERITY_TO_FINDING_SEVERITY[disk.severity];
      if (severity === undefined) {
        return [];
      }
      return [{
        severity,
        kind: "disk_low" as const,
        statement: `A disk of node ${node.hostname} is in the ${disk.severity} state.`,
        evidence: [`usedBytes=${disk.usedBytes}`, `totalBytes=${disk.totalBytes}`, `availableBytes=${disk.availableBytes}`],
      }];
    }));
  }

  private static checkUnusedImages(facts: ServerFacts): Finding[] {
    const images = facts.unusedImages ?? [];
    if (images.length === 0) {
      return [];
    }
    const tags = images.flatMap((image) => image.tags).slice(0, DiagnosisRuleUtil.MAX_LISTED_NAMES);
    return [{
      severity: "info",
      kind: "unused_images",
      statement: `${images.length} Docker images are unused and take disk space.`,
      evidence: [`unusedImages=${images.length}`, ...tags.map((tag) => `tag ${tag}`)],
    }];
  }

  private static checkRootDomainWithoutSsl(facts: ServerFacts): Finding[] {
    const { system } = facts;
    if (system === undefined || system.hasRootSsl) {
      return [];
    }
    return [{
      severity: "warning",
      kind: "root_domain_without_ssl",
      statement: "The root domain of the server has no SSL.",
      evidence: ["hasRootSsl=false", `rootDomain=${system.rootDomain}`],
    }];
  }

  private static checkUpdateAvailable(facts: ServerFacts): Finding[] {
    const { system } = facts;
    if (!system?.canUpdate) {
      return [];
    }
    return [{
      severity: "info",
      kind: "caprover_update_available",
      statement: "A newer CapRover version can be installed.",
      evidence: [`currentVersion=${system.currentVersion}`, `latestVersion=${system.latestVersion}`],
    }];
  }
}
