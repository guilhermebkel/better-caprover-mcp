import type { CaproverClientPort } from "@/Protocols/CaproverClientProtocol.ts";
import type { ToolDefinition } from "@/Protocols/OperationProtocol.ts";
import { AddCustomDomainOperation } from "@/Operations/AddCustomDomainOperation.ts";
import { CreateAppOperation } from "@/Operations/CreateAppOperation.ts";
import { DeleteAppOperation } from "@/Operations/DeleteAppOperation.ts";
import { DeployImageOperation } from "@/Operations/DeployImageOperation.ts";
import { EnableSslOperation } from "@/Operations/EnableSslOperation.ts";
import { GetAppLogsOperation } from "@/Operations/GetAppLogsOperation.ts";
import { GetAppOperation } from "@/Operations/GetAppOperation.ts";
import { GetAppRuntimeOperation } from "@/Operations/GetAppRuntimeOperation.ts";
import { GetBuildLogsOperation } from "@/Operations/GetBuildLogsOperation.ts";
import { GetOverviewOperation } from "@/Operations/GetOverviewOperation.ts";
import { ListAppsOperation } from "@/Operations/ListAppsOperation.ts";
import { ListOneClickAppsOperation } from "@/Operations/ListOneClickAppsOperation.ts";
import { ScaleAppOperation } from "@/Operations/ScaleAppOperation.ts";
import { SetEnvVarsOperation } from "@/Operations/SetEnvVarsOperation.ts";
import { AppResolverService } from "@/Services/AppResolverService.ts";
import type { OperationRunnerService } from "@/Services/OperationRunnerService.ts";
import type { PolicyService } from "@/Services/PolicyService.ts";

export class OperationManifest {
  static build(client: CaproverClientPort, policy: PolicyService, runner: OperationRunnerService): ToolDefinition[] {
    const resolver = new AppResolverService(client);
    return [
      runner.buildTool(GetOverviewOperation.NAME, new GetOverviewOperation(client, policy)),
      runner.buildTool(ListAppsOperation.NAME, new ListAppsOperation(client)),
      runner.buildTool(GetAppOperation.NAME, new GetAppOperation(resolver)),
      runner.buildTool(GetAppRuntimeOperation.NAME, new GetAppRuntimeOperation(client, resolver)),
      runner.buildTool(GetAppLogsOperation.NAME, new GetAppLogsOperation(client, resolver)),
      runner.buildTool(GetBuildLogsOperation.NAME, new GetBuildLogsOperation(client, resolver)),
      runner.buildTool(ListOneClickAppsOperation.NAME, new ListOneClickAppsOperation(client)),
      runner.buildTool(CreateAppOperation.NAME, new CreateAppOperation(client)),
      runner.buildTool(DeployImageOperation.NAME, new DeployImageOperation(client, resolver)),
      runner.buildTool(SetEnvVarsOperation.NAME, new SetEnvVarsOperation(client, resolver)),
      runner.buildTool(ScaleAppOperation.NAME, new ScaleAppOperation(client, resolver)),
      runner.buildTool(AddCustomDomainOperation.NAME, new AddCustomDomainOperation(client, resolver)),
      runner.buildTool(EnableSslOperation.NAME, new EnableSslOperation(client, resolver)),
      runner.buildTool(DeleteAppOperation.NAME, new DeleteAppOperation(client, resolver)),
    ];
  }
}
