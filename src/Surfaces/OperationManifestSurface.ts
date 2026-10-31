import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ManifestOptions } from "@/Protocols/ManifestProtocol.ts";
import type { ToolDefinition } from "@/Protocols/OperationProtocol.ts";
import { AddCustomDomainOperation } from "@/Operations/AddCustomDomainOperation.ts";
import { AddNodeOperation } from "@/Operations/AddNodeOperation.ts";
import { AddOneClickRepoOperation } from "@/Operations/AddOneClickRepoOperation.ts";
import { AddRegistryOperation } from "@/Operations/AddRegistryOperation.ts";
import { CreateAppOperation } from "@/Operations/CreateAppOperation.ts";
import { CreateProjectOperation } from "@/Operations/CreateProjectOperation.ts";
import { DeleteAppOperation } from "@/Operations/DeleteAppOperation.ts";
import { DeleteImagesOperation } from "@/Operations/DeleteImagesOperation.ts";
import { DeleteOneClickRepoOperation } from "@/Operations/DeleteOneClickRepoOperation.ts";
import { DeleteProjectsOperation } from "@/Operations/DeleteProjectsOperation.ts";
import { DeleteRegistryOperation } from "@/Operations/DeleteRegistryOperation.ts";
import { DeleteThemeOperation } from "@/Operations/DeleteThemeOperation.ts";
import { DeployArchiveOperation } from "@/Operations/DeployArchiveOperation.ts";
import { DeployImageOperation } from "@/Operations/DeployImageOperation.ts";
import { DeployOneClickOperation } from "@/Operations/DeployOneClickOperation.ts";
import { DisableSelfHostedRegistryOperation } from "@/Operations/DisableSelfHostedRegistryOperation.ts";
import { EnableRootSslOperation } from "@/Operations/EnableRootSslOperation.ts";
import { EnableSelfHostedRegistryOperation } from "@/Operations/EnableSelfHostedRegistryOperation.ts";
import { EnableSslOperation } from "@/Operations/EnableSslOperation.ts";
import { GetAccessOperation } from "@/Operations/GetAccessOperation.ts";
import { GetAppLogsOperation } from "@/Operations/GetAppLogsOperation.ts";
import { GetAppOperation } from "@/Operations/GetAppOperation.ts";
import { GetAppRuntimeOperation } from "@/Operations/GetAppRuntimeOperation.ts";
import { GetBuildLogsOperation } from "@/Operations/GetBuildLogsOperation.ts";
import { GetCurrentThemeOperation } from "@/Operations/GetCurrentThemeOperation.ts";
import { GetDiskCleanupOperation } from "@/Operations/GetDiskCleanupOperation.ts";
import { GetDiskUsageOperation } from "@/Operations/GetDiskUsageOperation.ts";
import { GetGoAccessOperation } from "@/Operations/GetGoAccessOperation.ts";
import { GetGuideOperation } from "@/Operations/GetGuideOperation.ts";
import { GetLoadBalancerOperation } from "@/Operations/GetLoadBalancerOperation.ts";
import { GetNetDataOperation } from "@/Operations/GetNetDataOperation.ts";
import { GetNginxConfigOperation } from "@/Operations/GetNginxConfigOperation.ts";
import { GetOneClickAppOperation } from "@/Operations/GetOneClickAppOperation.ts";
import { GetOneClickDeployProgressOperation } from "@/Operations/GetOneClickDeployProgressOperation.ts";
import { GetOverviewOperation } from "@/Operations/GetOverviewOperation.ts";
import { GetProStateOperation } from "@/Operations/GetProStateOperation.ts";
import { GetTwoFactorStatusOperation } from "@/Operations/GetTwoFactorStatusOperation.ts";
import { ListAppsOperation } from "@/Operations/ListAppsOperation.ts";
import { ListAppsRuntimeOperation } from "@/Operations/ListAppsRuntimeOperation.ts";
import { ListGoAccessReportsOperation } from "@/Operations/ListGoAccessReportsOperation.ts";
import { ListNodesOperation } from "@/Operations/ListNodesOperation.ts";
import { ListOneClickAppsOperation } from "@/Operations/ListOneClickAppsOperation.ts";
import { ListOneClickReposOperation } from "@/Operations/ListOneClickReposOperation.ts";
import { ListProAlertsOperation } from "@/Operations/ListProAlertsOperation.ts";
import { ListProjectsOperation } from "@/Operations/ListProjectsOperation.ts";
import { ListRegistriesOperation } from "@/Operations/ListRegistriesOperation.ts";
import { ListThemesOperation } from "@/Operations/ListThemesOperation.ts";
import { ListUnusedImagesOperation } from "@/Operations/ListUnusedImagesOperation.ts";
import { RemoveCustomDomainOperation } from "@/Operations/RemoveCustomDomainOperation.ts";
import { RenameAppOperation } from "@/Operations/RenameAppOperation.ts";
import { SaveThemeOperation } from "@/Operations/SaveThemeOperation.ts";
import { ScaleAppOperation } from "@/Operations/ScaleAppOperation.ts";
import { SetCurrentThemeOperation } from "@/Operations/SetCurrentThemeOperation.ts";
import { SetDefaultPushRegistryOperation } from "@/Operations/SetDefaultPushRegistryOperation.ts";
import { SetDiskCleanupOperation } from "@/Operations/SetDiskCleanupOperation.ts";
import { SetEnvVarsOperation } from "@/Operations/SetEnvVarsOperation.ts";
import { SetForceSslOperation } from "@/Operations/SetForceSslOperation.ts";
import { SetGoAccessOperation } from "@/Operations/SetGoAccessOperation.ts";
import { SetNetDataOperation } from "@/Operations/SetNetDataOperation.ts";
import { SetNginxConfigOperation } from "@/Operations/SetNginxConfigOperation.ts";
import { SetPasswordOperation } from "@/Operations/SetPasswordOperation.ts";
import { SetProApiKeyOperation } from "@/Operations/SetProApiKeyOperation.ts";
import { StartBuildOperation } from "@/Operations/StartBuildOperation.ts";
import { UpdateCaproverOperation } from "@/Operations/UpdateCaproverOperation.ts";
import { UpdateProjectOperation } from "@/Operations/UpdateProjectOperation.ts";
import { UpdateRegistryOperation } from "@/Operations/UpdateRegistryOperation.ts";
import { UpdateRootDomainOperation } from "@/Operations/UpdateRootDomainOperation.ts";
import { AppResolverService } from "@/Services/AppResolverService.ts";
import type { OperationRunnerService } from "@/Services/OperationRunnerService.ts";
import type { PolicyServicePort } from "@/Protocols/AccessProtocol.ts";

export class OperationManifestSurface {
  static build(
    client: CaproverClientPort,
    policy: PolicyServicePort,
    runner: OperationRunnerService,
    options: ManifestOptions = { toolsets: [], isElicitationAvailable: () => false },
  ): ToolDefinition[] {
    const resolver = new AppResolverService(client);
    const { toolsets, isElicitationAvailable } = options;
    return [
      runner.buildTool(GetOverviewOperation.NAME, new GetOverviewOperation(client, policy), "core"),
      runner.buildTool(GetAccessOperation.NAME, new GetAccessOperation(client, policy, toolsets, isElicitationAvailable), "core"),
      runner.buildTool(GetGuideOperation.NAME, new GetGuideOperation(), "core"),
      runner.buildTool(ListAppsOperation.NAME, new ListAppsOperation(client), "core"),
      runner.buildTool(GetAppOperation.NAME, new GetAppOperation(resolver), "core"),
      runner.buildTool(GetAppRuntimeOperation.NAME, new GetAppRuntimeOperation(client, resolver), "core"),
      runner.buildTool(GetAppLogsOperation.NAME, new GetAppLogsOperation(client, resolver), "core"),
      runner.buildTool(GetBuildLogsOperation.NAME, new GetBuildLogsOperation(client, resolver), "core"),
      runner.buildTool(ListAppsRuntimeOperation.NAME, new ListAppsRuntimeOperation(client), "apps"),
      runner.buildTool(CreateAppOperation.NAME, new CreateAppOperation(client), "apps"),
      runner.buildTool(DeployImageOperation.NAME, new DeployImageOperation(client, resolver), "apps"),
      runner.buildTool(DeployArchiveOperation.NAME, new DeployArchiveOperation(client, resolver), "apps"),
      runner.buildTool(StartBuildOperation.NAME, new StartBuildOperation(client), "apps"),
      runner.buildTool(SetEnvVarsOperation.NAME, new SetEnvVarsOperation(client, resolver), "apps"),
      runner.buildTool(ScaleAppOperation.NAME, new ScaleAppOperation(client, resolver), "apps"),
      runner.buildTool(RenameAppOperation.NAME, new RenameAppOperation(client, resolver), "apps"),
      runner.buildTool(DeleteAppOperation.NAME, new DeleteAppOperation(client, resolver), "apps"),
      runner.buildTool(AddCustomDomainOperation.NAME, new AddCustomDomainOperation(client, resolver), "domains"),
      runner.buildTool(EnableSslOperation.NAME, new EnableSslOperation(client, resolver), "domains"),
      runner.buildTool(RemoveCustomDomainOperation.NAME, new RemoveCustomDomainOperation(client, resolver), "domains"),
      runner.buildTool(EnableRootSslOperation.NAME, new EnableRootSslOperation(client), "domains"),
      runner.buildTool(SetForceSslOperation.NAME, new SetForceSslOperation(client), "domains"),
      runner.buildTool(UpdateRootDomainOperation.NAME, new UpdateRootDomainOperation(client), "domains"),
      runner.buildTool(ListProjectsOperation.NAME, new ListProjectsOperation(client), "projects"),
      runner.buildTool(CreateProjectOperation.NAME, new CreateProjectOperation(client), "projects"),
      runner.buildTool(UpdateProjectOperation.NAME, new UpdateProjectOperation(client), "projects"),
      runner.buildTool(DeleteProjectsOperation.NAME, new DeleteProjectsOperation(client), "projects"),
      runner.buildTool(ListOneClickAppsOperation.NAME, new ListOneClickAppsOperation(client), "oneclick"),
      runner.buildTool(GetOneClickAppOperation.NAME, new GetOneClickAppOperation(client), "oneclick"),
      runner.buildTool(ListOneClickReposOperation.NAME, new ListOneClickReposOperation(client), "oneclick"),
      runner.buildTool(AddOneClickRepoOperation.NAME, new AddOneClickRepoOperation(client), "oneclick"),
      runner.buildTool(DeleteOneClickRepoOperation.NAME, new DeleteOneClickRepoOperation(client), "oneclick"),
      runner.buildTool(DeployOneClickOperation.NAME, new DeployOneClickOperation(client), "oneclick"),
      runner.buildTool(GetOneClickDeployProgressOperation.NAME, new GetOneClickDeployProgressOperation(client), "oneclick"),
      runner.buildTool(ListRegistriesOperation.NAME, new ListRegistriesOperation(client), "registries"),
      runner.buildTool(AddRegistryOperation.NAME, new AddRegistryOperation(client), "registries"),
      runner.buildTool(UpdateRegistryOperation.NAME, new UpdateRegistryOperation(client), "registries"),
      runner.buildTool(DeleteRegistryOperation.NAME, new DeleteRegistryOperation(client), "registries"),
      runner.buildTool(SetDefaultPushRegistryOperation.NAME, new SetDefaultPushRegistryOperation(client), "registries"),
      runner.buildTool(EnableSelfHostedRegistryOperation.NAME, new EnableSelfHostedRegistryOperation(client), "registries"),
      runner.buildTool(DisableSelfHostedRegistryOperation.NAME, new DisableSelfHostedRegistryOperation(client), "registries"),
      runner.buildTool(ListNodesOperation.NAME, new ListNodesOperation(client), "cluster"),
      runner.buildTool(GetLoadBalancerOperation.NAME, new GetLoadBalancerOperation(client), "cluster"),
      runner.buildTool(AddNodeOperation.NAME, new AddNodeOperation(client), "cluster"),
      runner.buildTool(GetDiskUsageOperation.NAME, new GetDiskUsageOperation(client), "maintenance"),
      runner.buildTool(ListUnusedImagesOperation.NAME, new ListUnusedImagesOperation(client), "maintenance"),
      runner.buildTool(DeleteImagesOperation.NAME, new DeleteImagesOperation(client), "maintenance"),
      runner.buildTool(GetDiskCleanupOperation.NAME, new GetDiskCleanupOperation(client), "maintenance"),
      runner.buildTool(SetDiskCleanupOperation.NAME, new SetDiskCleanupOperation(client), "maintenance"),
      runner.buildTool(GetNginxConfigOperation.NAME, new GetNginxConfigOperation(client), "maintenance"),
      runner.buildTool(SetNginxConfigOperation.NAME, new SetNginxConfigOperation(client), "maintenance"),
      runner.buildTool(UpdateCaproverOperation.NAME, new UpdateCaproverOperation(client), "maintenance"),
      runner.buildTool(GetNetDataOperation.NAME, new GetNetDataOperation(client), "monitoring"),
      runner.buildTool(SetNetDataOperation.NAME, new SetNetDataOperation(client), "monitoring"),
      runner.buildTool(GetGoAccessOperation.NAME, new GetGoAccessOperation(client), "monitoring"),
      runner.buildTool(SetGoAccessOperation.NAME, new SetGoAccessOperation(client), "monitoring"),
      runner.buildTool(ListGoAccessReportsOperation.NAME, new ListGoAccessReportsOperation(client, resolver), "monitoring"),
      runner.buildTool(GetTwoFactorStatusOperation.NAME, new GetTwoFactorStatusOperation(client), "account"),
      runner.buildTool(SetPasswordOperation.NAME, new SetPasswordOperation(client), "account"),
      runner.buildTool(GetProStateOperation.NAME, new GetProStateOperation(client), "account"),
      runner.buildTool(SetProApiKeyOperation.NAME, new SetProApiKeyOperation(client), "account"),
      runner.buildTool(ListProAlertsOperation.NAME, new ListProAlertsOperation(client), "account"),
      runner.buildTool(ListThemesOperation.NAME, new ListThemesOperation(client), "account"),
      runner.buildTool(GetCurrentThemeOperation.NAME, new GetCurrentThemeOperation(client), "account"),
      runner.buildTool(SetCurrentThemeOperation.NAME, new SetCurrentThemeOperation(client), "account"),
      runner.buildTool(SaveThemeOperation.NAME, new SaveThemeOperation(client), "account"),
      runner.buildTool(DeleteThemeOperation.NAME, new DeleteThemeOperation(client), "account"),
    ];
  }
}
