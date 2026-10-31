import {
  buildChangeOutputSchema,
  buildListOutputSchema,
  buildReadOutputSchema,
  CountOutputSchema,
  FlagOutputSchema,
  RowListOutputSchema,
  TextListOutputSchema,
  TextOutputSchema,
} from "@/Schemas/OutputSchema.ts";

export const GetOverviewOutputSchema = buildReadOutputSchema({
  rootDomain: TextOutputSchema,
  hasRootSsl: FlagOutputSchema,
  isSslForced: FlagOutputSchema,
  caproverVersion: TextOutputSchema,
  latestVersion: TextOutputSchema,
  canUpdate: FlagOutputSchema,
  appCount: CountOutputSchema,
  enabledRiskTiers: TextListOutputSchema,
  accessMode: TextOutputSchema,
});

export const ListAppsOutputSchema = buildListOutputSchema("apps");

export const GetAppOutputSchema = buildReadOutputSchema({
  appName: TextOutputSchema,
  url: TextOutputSchema,
  instanceCount: CountOutputSchema,
  isBuilding: FlagOutputSchema,
  envVars: RowListOutputSchema,
});

export const GetAppRuntimeOutputSchema = buildReadOutputSchema({
  appName: TextOutputSchema,
  status: TextOutputSchema,
  tasks: RowListOutputSchema,
});

export const GetAppLogsOutputSchema = buildReadOutputSchema({
  appName: TextOutputSchema,
  lines: TextListOutputSchema,
  totalLines: CountOutputSchema,
  isTruncated: FlagOutputSchema,
});

export const GetBuildLogsOutputSchema = buildReadOutputSchema({
  appName: TextOutputSchema,
  isBuilding: FlagOutputSchema,
  isFailed: FlagOutputSchema,
  lines: TextListOutputSchema,
  isTruncated: FlagOutputSchema,
});

export const ListOneClickAppsOutputSchema = buildListOutputSchema("apps");

export const CreateAppOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
  hasPersistentData: FlagOutputSchema,
});

export const DeployImageOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
  imageName: TextOutputSchema,
});

export const SetEnvVarsOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
  addedKeys: TextListOutputSchema,
  updatedKeys: TextListOutputSchema,
  removedKeys: TextListOutputSchema,
  totalKeysAfter: CountOutputSchema,
});

export const ScaleAppOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
  previousInstanceCount: CountOutputSchema,
  instanceCount: CountOutputSchema,
});

export const AddCustomDomainOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
  domain: TextOutputSchema,
});

export const EnableSslOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
});

export const DeleteAppOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
  deletedVolumes: TextListOutputSchema,
});

export const GetGuideOutputSchema = buildReadOutputSchema({
  topic: TextOutputSchema,
  text: TextOutputSchema,
  topics: TextListOutputSchema,
});

export const GetAccessOutputSchema = buildReadOutputSchema({
  accessMode: TextOutputSchema,
  enabledRiskTiers: TextListOutputSchema,
  isCriticalUnlocked: FlagOutputSchema,
  surface: TextOutputSchema,
  toolsets: TextListOutputSchema,
  isElicitationAvailable: FlagOutputSchema,
  caproverVersion: TextOutputSchema,
});

export const ListAppsRuntimeOutputSchema = buildListOutputSchema("apps");

export const RenameAppOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
  newAppName: TextOutputSchema,
});

export const StartBuildOutputSchema = buildChangeOutputSchema({ isStarted: FlagOutputSchema });

export const DeployArchiveOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
  archiveBytes: CountOutputSchema,
});

export const DiagnoseAppOutputSchema = buildReadOutputSchema({
  appName: TextOutputSchema,
  findings: RowListOutputSchema,
  rulesRun: TextListOutputSchema,
  rulesSkipped: RowListOutputSchema,
});

export const FindIssuesOutputSchema = buildListOutputSchema("findings");

export const RedeployAppOutputSchema = buildChangeOutputSchema({
  appName: TextOutputSchema,
  imageName: TextOutputSchema,
});

export const BulkEnvUpdateOutputSchema = buildChangeOutputSchema({
  applied: TextListOutputSchema,
  notApplied: TextListOutputSchema,
  plans: RowListOutputSchema,
});
