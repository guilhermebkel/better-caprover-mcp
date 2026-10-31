# Risk tiers and toolsets

The tier and the toolset of every operation of the `tools` surface, and why. The code is the source: `src/Surfaces/OperationManifestSurface.ts` lists the operations with their toolset, each operation declares its tier, and `src/Surfaces/OperationManifestSurface.test.ts` fails when a row of the table below names another tier or toolset than the code. The rules a tier brings are in `docs/mcp-standards.md` and in ADR 0005 and ADR 0011.

## How a tier is chosen

| Tier | Choose it when the call | Mode that registers it | Extra |
| --- | --- | --- | --- |
| `read` | only reads, and never returns a secret | `readonly` | none |
| `write` | changes something that can be changed back by calling again | `operate` | `dry_run` and a preview |
| `destructive` | removes something that cannot be restored, or cuts a route that apps use | `admin` | `user_confirmed` and a `confirmation_token` |
| `critical` | can lock the server out, break every app, or change how all apps are stored | `admin` and `CAPROVER_MCP_ALLOW_CRITICAL=1` | the same as `destructive` |

## Critical operations

These eight calls can lock the server out or break it for every app. They are registered only in `admin` mode with `CAPROVER_MCP_ALLOW_CRITICAL=1`, and every one has a policy test (`OperationManifestSurface.test.ts` runs the same contract on each).

- `set_password`: this server keeps logging in with the old password until the person updates `CAPROVER_PASSWORD`.
- `update_caprover`: restarts the dashboard and every app, and a failed update can leave the server down.
- `update_root_domain`: every app URL and the dashboard URL change.
- `set_nginx_config`: a bad template stops the web server for every app.
- `add_node`: logs in to another server over SSH with a private key and installs Docker on it.
- `enable_self_hosted_registry` and `disable_self_hosted_registry`: change where every app image is stored.
- `delete_images`: removes images that an app may need to start again.

This is the list the issue proposed. It stays a proposal until the maintainer confirms it; moving an operation between tiers is a one-line change in its class plus its description, and the tests show the rest.

## Toolsets

`CAPROVER_MCP_TOOLSETS` is a comma-separated list. The default is `core,apps,domains,oneclick`: every operation of the first release stays registered, and the other 37 are opt-in so the tool list stays short. An unknown name stops the server at startup and lists the valid ones. The mode and the critical switch still apply inside a toolset.

| Toolset | Holds |
| --- | --- |
| `core` | the overview, access, guide, and the reads of apps, logs and runtime |
| `apps` | create, deploy (image, archive, build webhook), env vars, scale, rename, delete |
| `domains` | custom domains, HTTPS, the root domain and the HTTPS redirect |
| `projects` | the projects that group apps |
| `oneclick` | the one-click catalog, its repositories and the install |
| `registries` | Docker registries and the self-hosted registry |
| `cluster` | nodes and the load balancer |
| `maintenance` | disk, unused images, the cleanup, nginx and the CapRover update |
| `monitoring` | NetData and GoAccess |
| `account` | the password, two-factor status, CapRover Pro and dashboard themes |

## Every SDK method

`get_access` and `get_guide` wrap no SDK method: both are `read` operations of the `core` toolset.

| SDK method | Operation | Tier | Toolset |
| --- | --- | --- | --- |
| `getAllThemes` | `list_themes` | read | account |
| `getCurrentTheme` | `get_current_theme` | read | account |
| `setCurrentTheme` | `set_current_theme` | write | account |
| `saveTheme` | `save_theme` | write | account |
| `deleteTheme` | `delete_theme` | destructive | account |
| `getProFeaturesState` | `get_pro_state` | read | account |
| `setProApiKey` | `set_pro_api_key` | write | account |
| `getProConfigs` | `list_pro_alerts` | read | account |
| `getOtpStatus` | `get_two_factor_status` | read | account |
| `getCaptainInfo` | `get_overview` | read | core |
| `updateRootDomain` | `update_root_domain` | critical | domains |
| `enableRootSsl` | `enable_root_ssl` | write | domains |
| `forceSsl` | `set_force_ssl` | write | domains |
| `getAllApps` | `list_apps` | read | core |
| `getAllApps` | `get_app` | read | core |
| `getAllProjects` | `list_projects` | read | projects |
| `getAppsRuntime` | `list_apps_runtime` | read | apps |
| `getAppRuntime` | `get_app_runtime` | read | core |
| `fetchBuildLogs` | `get_build_logs` | read | core |
| `fetchAppLogsInHex` | `get_app_logs` | read | core |
| `fetchAppLogs` | `get_app_logs` | read | core |
| `uploadAppData` | `deploy_archive` | write | apps |
| `registerProject` | `create_project` | write | projects |
| `updateProject` | `update_project` | write | projects |
| `uploadCaptainDefinitionContent` | `deploy_image` | write | apps |
| `patchAppDefinition` | `set_env_vars` | write | apps |
| `patchAppDefinition` | `scale_app` | write | apps |
| `renameApp` | `rename_app` | write | apps |
| `registerNewApp` | `create_app` | write | apps |
| `deleteApp` | `delete_app` | destructive | apps |
| `deleteProjects` | `delete_projects` | destructive | projects |
| `enableSslForBaseDomain` | `enable_ssl` | write | domains |
| `attachNewCustomDomainToApp` | `add_custom_domain` | write | domains |
| `enableSslForCustomDomain` | `enable_ssl` | write | domains |
| `removeCustomDomain` | `remove_custom_domain` | destructive | domains |
| `getLoadBalancerInfo` | `get_load_balancer` | read | cluster |
| `getNetDataInfo` | `get_net_data` | read | monitoring |
| `updateNetDataInfo` | `set_net_data` | write | monitoring |
| `getGoAccessInfo` | `get_go_access` | read | monitoring |
| `updateGoAccessInfo` | `set_go_access` | write | monitoring |
| `getGoAccessReports` | `list_go_access_reports` | read | monitoring |
| `changePass` | `set_password` | critical | account |
| `getVersionInfo` | `get_overview` | read | core |
| `performUpdate` | `update_caprover` | critical | maintenance |
| `getNginxConfig` | `get_nginx_config` | read | maintenance |
| `setNginxConfig` | `set_nginx_config` | critical | maintenance |
| `getUnusedImages` | `list_unused_images` | read | maintenance |
| `deleteImages` | `delete_images` | critical | maintenance |
| `getDiskUsage` | `get_disk_usage` | read | maintenance |
| `getDiskCleanUpSettings` | `get_disk_cleanup` | read | maintenance |
| `setDiskCleanUpSettings` | `set_disk_cleanup` | write | maintenance |
| `getDockerRegistries` | `list_registries` | read | registries |
| `enableSelfHostedDockerRegistry` | `enable_self_hosted_registry` | critical | registries |
| `disableSelfHostedDockerRegistry` | `disable_self_hosted_registry` | critical | registries |
| `addDockerRegistry` | `add_registry` | write | registries |
| `updateDockerRegistry` | `update_registry` | write | registries |
| `deleteDockerRegistry` | `delete_registry` | destructive | registries |
| `setDefaultPushDockerRegistry` | `set_default_push_registry` | write | registries |
| `forceBuild` | `start_build` | write | apps |
| `getAllNodes` | `list_nodes` | read | cluster |
| `getAllOneClickApps` | `list_one_click_apps` | read | oneclick |
| `getOneClickAppByName` | `get_one_click_app` | read | oneclick |
| `getAllOneClickAppRepos` | `list_one_click_repos` | read | oneclick |
| `addNewCustomOneClickRepo` | `add_one_click_repo` | write | oneclick |
| `deleteCustomOneClickRepo` | `delete_one_click_repo` | destructive | oneclick |
| `addDockerNode` | `add_node` | critical | cluster |
| `startOneClickAppDeploy` | `deploy_one_click` | write | oneclick |
| `getOneClickAppDeployProgress` | `get_one_click_deploy_progress` | read | oneclick |

## Methods kept for later

Each has a reason, and `pnpm sdk:drift` fails when a planned method has none or when a method is not classified.

| SDK method | Status | Reason |
| --- | --- | --- |
| `destroy` | none | The adapter never closes the client during the life of the server. |
| `login` | none | The adapter logs in with the password before the first call. |
| `setProConfigs` | planned | The alert action metadata is typed `any` in the SDK and CapRover does not document its shape; a strict input schema needs a response recorded from a CapRover Pro server first. |
| `setOtpStatus` | none | It would turn on two-factor login, which this server cannot use (ADR 0010). |
| `updateConfigAndSave` | planned | It re-sends the whole app definition, so it is offered only in the `code` surface (Phase 4), with a warning; the `tools` surface edits an app through small named operations. |
| `getGoAccessReport` | planned | The SDK parses every answer as JSON, but a GoAccess report is an HTML page, so the call cannot return it; it needs an answer recorded from a real CapRover and a text-capable call in the adapter. |
| `createBackup` | planned | It returns a one-time download token that this server must not return, and the MCP has no way to stream the archive; it waits for a design with resources or an upload target. |
| `executeGenericApiCommand` | none | It would send any request and so bypass the access mode (ADR 0003). |
