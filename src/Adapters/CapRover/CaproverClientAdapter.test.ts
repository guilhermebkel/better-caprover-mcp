import { afterEach, describe, expect, it, vi } from "vitest";
import appsRuntime from "@/Testing/fixtures/appsRuntime.json" with { type: "json" };
import currentTheme from "@/Testing/fixtures/currentTheme.json" with { type: "json" };
import diskCleanup from "@/Testing/fixtures/diskCleanup.json" with { type: "json" };
import diskUsage from "@/Testing/fixtures/diskUsage.json" with { type: "json" };
import goAccess from "@/Testing/fixtures/goAccess.json" with { type: "json" };
import goAccessReports from "@/Testing/fixtures/goAccessReports.json" with { type: "json" };
import loadBalancer from "@/Testing/fixtures/loadBalancer.json" with { type: "json" };
import netData from "@/Testing/fixtures/netData.json" with { type: "json" };
import nginxConfig from "@/Testing/fixtures/nginxConfig.json" with { type: "json" };
import nodes from "@/Testing/fixtures/nodes.json" with { type: "json" };
import oneClickJob from "@/Testing/fixtures/oneClickJob.json" with { type: "json" };
import oneClickProgress from "@/Testing/fixtures/oneClickProgress.json" with { type: "json" };
import oneClickRepos from "@/Testing/fixtures/oneClickRepos.json" with { type: "json" };
import oneClickTemplate from "@/Testing/fixtures/oneClickTemplate.json" with { type: "json" };
import otpStatus from "@/Testing/fixtures/otpStatus.json" with { type: "json" };
import proConfigs from "@/Testing/fixtures/proConfigs.json" with { type: "json" };
import projects from "@/Testing/fixtures/projects.json" with { type: "json" };
import proState from "@/Testing/fixtures/proState.json" with { type: "json" };
import registeredProject from "@/Testing/fixtures/registeredProject.json" with { type: "json" };
import registries from "@/Testing/fixtures/registries.json" with { type: "json" };
import themes from "@/Testing/fixtures/themes.json" with { type: "json" };
import unusedImages from "@/Testing/fixtures/unusedImages.json" with { type: "json" };
import appAlreadyExists from "@/Testing/fixtures/appAlreadyExists.json" with { type: "json" };
import appDefinitions from "@/Testing/fixtures/appDefinitions.json" with { type: "json" };
import appLogs from "@/Testing/fixtures/appLogs.json" with { type: "json" };
import appRuntime from "@/Testing/fixtures/appRuntime.json" with { type: "json" };
import buildLogs from "@/Testing/fixtures/buildLogs.json" with { type: "json" };
import emptyOk from "@/Testing/fixtures/emptyOk.json" with { type: "json" };
import genericError from "@/Testing/fixtures/genericError.json" with { type: "json" };
import login from "@/Testing/fixtures/login.json" with { type: "json" };
import oneClickApps from "@/Testing/fixtures/oneClickApps.json" with { type: "json" };
import otpRequired from "@/Testing/fixtures/otpRequired.json" with { type: "json" };
import systemInfo from "@/Testing/fixtures/systemInfo.json" with { type: "json" };
import tokenInvalid from "@/Testing/fixtures/tokenInvalid.json" with { type: "json" };
import versionInfo from "@/Testing/fixtures/versionInfo.json" with { type: "json" };
import recordedSystemInfo from "@/Testing/fixtures/recordedSystemInfo.json" with { type: "json" };
import recordedVersionInfo from "@/Testing/fixtures/recordedVersionInfo.json" with { type: "json" };
import recordedWrongPassword from "@/Testing/fixtures/recordedWrongPassword.json" with { type: "json" };
import wrongPassword from "@/Testing/fixtures/wrongPassword.json" with { type: "json" };
import { CaproverClientAdapter } from "@/Adapters/CapRover/CaproverClientAdapter.ts";
import { MockCaproverServer } from "@/Testing/MockCaproverServer.ts";
import { CaproverConfigError } from "@/Errors/CaproverConfigError.ts";
import { CaproverRequestError } from "@/Errors/CaproverRequestError.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";

const FAKE_PASSWORD = "fake-password-9876";
const API = "/api/v2";
const CUSTOM_DOMAIN = "www.example.org";
const VOLUME_NAME = "web-data";
const IMAGE_NAME = "nginx:1.27";
const FAKE_ENV_VALUE = "fake-env-value-123";

const OPS_EMAIL = "ops@example.com";
const EXAMPLE_REPO = "https://example.com/apps";
const OFFICIAL_REPO = "https://oneclick-apps.caprover.com";
const REGISTRY_PASSWORD = "fake-reg-pass";
const REGISTRY_HOST = "registry.example.com";
const UNUSED_IMAGE_ID = "sha256:aaa";
const NEW_PASSWORD = "fake-new-password-1";

const WRITE_PATHS = [
  "/user/apps/appDefinitions/rename",
  "/user/apps/appDefinitions/removecustomdomain",
  "/user/system/changerootdomain",
  "/user/system/enablessl",
  "/user/system/forcessl",
  "/user/projects/update",
  "/user/projects/delete",
  "/user/oneclick/repositories/insert",
  "/user/oneclick/repositories/delete",
  "/user/registries/insert",
  "/user/registries/update",
  "/user/registries/delete",
  "/user/registries/setpush",
  "/user/system/selfhostregistry/enableregistry",
  "/user/system/selfhostregistry/disableregistry",
  "/user/system/nodes",
  "/user/apps/appDefinitions/deleteImages",
  "/user/system/diskcleanup",
  "/user/system/versioninfo",
  "/user/system/nginxconfig",
  "/user/system/netdata",
  "/user/system/goaccess",
  "/user/changepassword",
  "/user/pro/apikey",
  "/user/system/themes/setcurrent",
  "/user/system/themes/update",
  "/user/system/themes/delete",
  "/user/apps/webhooks/triggerbuild",
];

const reply = (fixture: object): string => JSON.stringify(fixture);

const buildRoutes = (): Map<string, string> => new Map([
  ["TOKEN_INVALID", reply(tokenInvalid)],
  [`POST ${API}/login`, reply(login)],
  [`GET ${API}/user/system/info`, reply(systemInfo)],
  [`GET ${API}/user/system/versioninfo`, reply(versionInfo)],
  [`GET ${API}/user/apps/appDefinitions`, reply(appDefinitions)],
  [`GET ${API}/user/apps/runtime/web`, reply(appRuntime)],
  [`GET ${API}/user/apps/appData/web/logs`, reply(appLogs)],
  [`GET ${API}/user/apps/appData/web`, reply(buildLogs)],
  [`GET ${API}/user/oneclick/template/list`, reply(oneClickApps)],
  [`POST ${API}/user/apps/appDefinitions/register`, reply(emptyOk)],
  [`POST ${API}/user/apps/appData/web`, reply(emptyOk)],
  [`PATCH ${API}/user/apps/appDefinitions/update`, reply(emptyOk)],
  [`POST ${API}/user/apps/appDefinitions/customdomain`, reply(emptyOk)],
  [`POST ${API}/user/apps/appDefinitions/enablebasedomainssl`, reply(emptyOk)],
  [`POST ${API}/user/apps/appDefinitions/enablecustomdomainssl`, reply(emptyOk)],
  [`POST ${API}/user/apps/appDefinitions/delete`, reply(emptyOk)],
  [`GET ${API}/user/apps/runtime`, reply(appsRuntime)],
  [`GET ${API}/user/projects`, reply(projects)],
  [`POST ${API}/user/projects/register`, reply(registeredProject)],
  [`GET ${API}/user/system/nodes`, reply(nodes)],
  [`GET ${API}/user/system/loadbalancerinfo`, reply(loadBalancer)],
  [`GET ${API}/user/system/diskusage`, reply(diskUsage)],
  [`GET ${API}/user/apps/appDefinitions/unusedImages`, reply(unusedImages)],
  [`GET ${API}/user/system/diskcleanup`, reply(diskCleanup)],
  [`GET ${API}/user/system/nginxconfig`, reply(nginxConfig)],
  [`GET ${API}/user/system/netdata`, reply(netData)],
  [`GET ${API}/user/system/goaccess`, reply(goAccess)],
  [`GET ${API}/user/system/goaccess/web/files`, reply(goAccessReports)],
  [`GET ${API}/user/registries`, reply(registries)],
  [`GET ${API}/user/oneclick/repositories`, reply(oneClickRepos)],
  [`GET ${API}/user/oneclick/template/app`, reply(oneClickTemplate)],
  [`POST ${API}/user/oneclick/deploy`, reply(oneClickJob)],
  [`GET ${API}/user/oneclick/deploy/progress`, reply(oneClickProgress)],
  [`GET ${API}/user/pro/state`, reply(proState)],
  [`GET ${API}/user/pro/configs`, reply(proConfigs)],
  [`GET ${API}/user/pro/otp`, reply(otpStatus)],
  [`GET ${API}/user/system/themes/all`, reply(themes)],
  [`GET ${API}/theme/current`, reply(currentTheme)],
  ...WRITE_PATHS.map((path): [string, string] => [`POST ${API}${path}`, reply(emptyOk)]),
]);

let server: MockCaproverServer | undefined;

afterEach(async () => {
  await server?.stop();
  server = undefined;
  vi.unstubAllEnvs();
});

const start = async (routes: Map<string, string> = buildRoutes()): Promise<{
  client: CaproverClientAdapter;
  mock: MockCaproverServer;
}> => {
  const mock = new MockCaproverServer(routes);
  server = mock;
  const url = await mock.start();
  return { client: new CaproverClientAdapter({ url, password: FAKE_PASSWORD }), mock };
};

describe("CaproverClientAdapter.getSystemInfo()", () => {
  it("joins the captain info and the version info", async () => {
    const { client } = await start();

    expect(await client.getSystemInfo()).toStrictEqual({
      rootDomain: "example.com",
      hasRootSsl: true,
      isSslForced: false,
      currentVersion: "1.14.1",
      latestVersion: "1.15.0",
      canUpdate: true,
    });
  });

  it("reads a fresh CapRover that has no root domain and sends no SSL flag", async () => {
    const routes = buildRoutes();
    routes.set(`GET ${API}/user/system/info`, reply(recordedSystemInfo));
    routes.set(`GET ${API}/user/system/versioninfo`, reply(recordedVersionInfo));
    const { client } = await start(routes);

    expect(await client.getSystemInfo()).toStrictEqual({
      rootDomain: "",
      hasRootSsl: false,
      isSslForced: false,
      currentVersion: "1.15.5",
      latestVersion: "1.15.5",
      canUpdate: false,
    });
  });

  it("logs in once and sends the session token on the next requests", async () => {
    const { client, mock } = await start();

    await client.getSystemInfo();
    await client.listApps();

    expect(mock.requests.filter((request) => request.path === `${API}/login`)).toHaveLength(1);
    expect(mock.requests.filter((request) => request.token === MockCaproverServer.TOKEN)).toHaveLength(3);
    expect(mock.requests[0]?.body).toStrictEqual({ password: FAKE_PASSWORD });
  });
});

describe("CaproverClientAdapter.listApps()", () => {
  it("maps the app definitions and builds the default URL", async () => {
    const { client } = await start();

    const { rootDomain, apps } = await client.listApps();

    expect(rootDomain).toBe("example.com");
    expect(apps[0]).toStrictEqual({
      appName: "web",
      url: "https://web.example.com",
      instanceCount: 2,
      deployedVersion: 2,
      imageName: IMAGE_NAME,
      hasPersistentData: true,
      isExposedAsWebApp: true,
      hasForcedSsl: false,
      hasDefaultDomainSsl: true,
      containerHttpPort: 80,
      isBuilding: false,
      customDomains: [{ publicDomain: CUSTOM_DOMAIN, hasSsl: true }],
      envVars: [{ key: "API_TOKEN", value: FAKE_ENV_VALUE }, { key: "MODE", value: "prod" }],
      ports: [{ containerPort: 80, hostPort: 8080 }],
      volumes: [{ containerPath: "/data", volumeName: VOLUME_NAME }],
    });
  });

  it("uses http and no image for an app that never deployed", async () => {
    const { client } = await start();

    const { apps } = await client.listApps();

    expect(apps[1]).toMatchObject({
      appName: "worker",
      url: "http://worker.example.com",
      imageName: undefined,
      isExposedAsWebApp: false,
      instanceCount: 0,
    });
  });
  describe("when the login fails", () => {
    it("tells the person the password is wrong, without echoing what CapRover sent", async () => {
      const routes = buildRoutes();
      routes.set(`POST ${API}/login`, reply(wrongPassword));
      const { client } = await start(routes);

      await expect(client.listApps()).rejects.toThrow(
        "CapRover rejected the password. Tell the person to check CAPROVER_PASSWORD.",
      );
    });

    it("tells the person the password is wrong when a real CapRover said so", async () => {
      const routes = buildRoutes();
      routes.set(`POST ${API}/login`, reply(recordedWrongPassword));
      const { client } = await start(routes);

      await expect(client.listApps()).rejects.toThrow(
        "CapRover rejected the password. Tell the person to check CAPROVER_PASSWORD.",
      );
    });

    it("explains that two-factor login is not supported", async () => {
      const routes = buildRoutes();
      routes.set(`POST ${API}/login`, reply(otpRequired));
      const { client } = await start(routes);

      await expect(client.listApps()).rejects.toThrow(
        "This CapRover asks for a two-factor code. This server does not support two-factor login, so it cannot log in.",
      );
    });

    it("tries to log in again on the next call", async () => {
      const routes = buildRoutes();
      routes.set(`POST ${API}/login`, reply(wrongPassword));
      const { client } = await start(routes);
      await client.listApps().catch(() => undefined);
      routes.set(`POST ${API}/login`, reply(login));

      const { apps } = await client.listApps();

      expect(apps).toHaveLength(2);
    });
  });

  describe("when CapRover cannot be reached", () => {
    it("names the address and the error code", async () => {
      const client = new CaproverClientAdapter({ url: "http://127.0.0.1:1", password: FAKE_PASSWORD });

      await expect(client.listApps()).rejects.toThrow(
        "Cannot reach CapRover at http://127.0.0.1:1 (ECONNREFUSED). Tell the person to check CAPROVER_URL and that the server is online.",
      );
    });

    it("throws a CaproverRequestError", async () => {
      const client = new CaproverClientAdapter({ url: "http://127.0.0.1:1", password: FAKE_PASSWORD });

      await expect(client.listApps()).rejects.toBeInstanceOf(CaproverRequestError);
    });
  });

  describe("when there is no configuration", () => {
    it("asks the person to set CAPROVER_URL and CAPROVER_PASSWORD", async () => {
      await expect(new CaproverClientAdapter(undefined).listApps()).rejects.toBeInstanceOf(CaproverConfigError);
      await expect(new CaproverClientAdapter(undefined).listApps()).rejects.toThrow(/CAPROVER_URL and CAPROVER_PASSWORD/);
    });
  });
});

describe("CaproverClientAdapter.getAppRuntime()", () => {
  it("maps the tasks and turns a state it does not know into unknown", async () => {
    const { client } = await start();

    expect(await client.getAppRuntime("web")).toStrictEqual({
      appName: "web",
      status: "degraded",
      desiredInstances: 2,
      runningInstances: 1,
      tasks: [
        { state: "running", image: IMAGE_NAME, message: "started", error: undefined, exitCode: undefined },
        { state: "unknown", image: IMAGE_NAME, message: "waiting", error: "no suitable node", exitCode: 1 },
      ],
      latestFailure: { occurredAt: undefined, error: "task failed" },
      collectionError: undefined,
    });
  });

  it("explains that an older CapRover has no runtime endpoint", async () => {
    const routes = buildRoutes();
    routes.delete(`GET ${API}/user/apps/runtime/web`);
    const { client } = await start(routes);

    await expect(client.getAppRuntime("web")).rejects.toThrow(
      "This CapRover version has no runtime endpoint (CapRover 1.15.5 has none). "
      + "To see how the app runs, use `get_app_logs` and `get_build_logs`.",
    );
  });
});

describe("CaproverClientAdapter.getAppLogs()", () => {
  it("decodes the frames of the log and asks for hex", async () => {
    const { client, mock } = await start();

    const logs = await client.getAppLogs("web");

    expect(logs).toBe("first line\nsecond line with fake-env-value-123\n");
    expect(mock.requests.at(-1)?.query).toBe("encoding=hex");
  });
});

describe("CaproverClientAdapter.getBuildLogs()", () => {
  it("maps the build state and the lines", async () => {
    const { client } = await start();

    expect(await client.getBuildLogs("web")).toStrictEqual({
      isBuilding: true,
      isFailed: false,
      lines: ["Step 1/2", "Step 2/2"],
    });
  });
});

describe("CaproverClientAdapter.listOneClickApps()", () => {
  it("keeps the name, display name and description", async () => {
    const { client } = await start();

    expect(await client.listOneClickApps()).toStrictEqual([
      { name: "postgres", displayName: "PostgreSQL", description: "The SQL database" },
    ]);
  });
});

describe("CaproverClientAdapter.createApp()", () => {
  it("registers the app without a project and waits for it", async () => {
    const { client, mock } = await start();

    await client.createApp({ appName: "api", hasPersistentData: true });

    const request = mock.requests.at(-1);
    expect(request?.path).toBe(`${API}/user/apps/appDefinitions/register`);
    expect(request?.query).toBe("");
    expect(request?.body).toStrictEqual({ appName: "api", projectId: "", hasPersistentData: true });
  });

  it("says what CapRover refused and hides the password if CapRover echoes it", async () => {
    const routes = buildRoutes();
    routes.set(`POST ${API}/user/apps/appDefinitions/register`, reply(genericError));
    const { client } = await start(routes);

    await expect(client.createApp({ appName: "api", hasPersistentData: false })).rejects.toThrow(
      "CapRover refused the request (code 1000): Failed for [REDACTED]",
    );
  });

  it("passes on the message when the name is taken", async () => {
    const routes = buildRoutes();
    routes.set(`POST ${API}/user/apps/appDefinitions/register`, reply(appAlreadyExists));
    const { client } = await start(routes);

    await expect(client.createApp({ appName: "web", hasPersistentData: false })).rejects.toThrow(
      "CapRover refused the request (code 1103): App already exists",
    );
  });
});

describe("CaproverClientAdapter.deployImage()", () => {
  it("sends a captain definition with the image, detached", async () => {
    const { client, mock } = await start();

    await client.deployImage("web", "nginx:1.28");

    const request = mock.requests.at(-1);
    expect(request?.query).toBe("detached=1");
    expect(request?.body).toStrictEqual({
      captainDefinitionContent: JSON.stringify({ schemaVersion: 2, imageName: "nginx:1.28" }),
      gitHash: "",
    });
  });
});

describe("CaproverClientAdapter.setEnvVars()", () => {
  it("patches the env vars of the app", async () => {
    const { client, mock } = await start();

    await client.setEnvVars("web", [{ key: "A", value: "1" }]);

    const request = mock.requests.at(-1);
    expect(request?.method).toBe("PATCH");
    expect(request?.body).toStrictEqual({ envVars: [{ key: "A", value: "1" }], appName: "web" });
  });
});

describe("CaproverClientAdapter.setInstanceCount()", () => {
  it("patches the instance count of the app", async () => {
    const { client, mock } = await start();

    await client.setInstanceCount("web", 3);

    expect(mock.requests.at(-1)?.body).toStrictEqual({ instanceCount: 3, appName: "web" });
  });
});

describe("CaproverClientAdapter.addCustomDomain()", () => {
  it("attaches the domain", async () => {
    const { client, mock } = await start();

    await client.addCustomDomain("web", "api.example.com");

    expect(mock.requests.at(-1)?.body).toStrictEqual({ appName: "web", customDomain: "api.example.com" });
  });
});

describe("CaproverClientAdapter.enableSsl()", () => {
  it("turns on SSL for the default domain when no domain is given", async () => {
    const { client, mock } = await start();

    await client.enableSsl("web", undefined);

    expect(mock.requests.at(-1)?.path).toBe(`${API}/user/apps/appDefinitions/enablebasedomainssl`);
  });

  it("turns on SSL for a custom domain", async () => {
    const { client, mock } = await start();

    await client.enableSsl("web", CUSTOM_DOMAIN);

    const request = mock.requests.at(-1);
    expect(request?.path).toBe(`${API}/user/apps/appDefinitions/enablecustomdomainssl`);
    expect(request?.body).toStrictEqual({ appName: "web", customDomain: CUSTOM_DOMAIN });
  });
});

describe("CaproverClientAdapter.deleteApp()", () => {
  it("sends the app and the volumes to delete", async () => {
    const { client, mock } = await start();

    await client.deleteApp("web", [VOLUME_NAME]);

    expect(mock.requests.at(-1)?.body).toStrictEqual({ appName: "web", volumes: [VOLUME_NAME] });
  });
});

describe("CaproverClientAdapter.buildFromEnv()", () => {
  it("is not configured when the password is missing", async () => {
    vi.stubEnv("CAPROVER_URL", "https://captain.example.com");
    vi.stubEnv("CAPROVER_PASSWORD", undefined);
    const client = CaproverClientAdapter.buildFromEnv(EnvUtil.read());

    await expect(client.listApps()).rejects.toBeInstanceOf(CaproverConfigError);
  });
});

describe("CaproverClientAdapter.listAppsRuntime()", () => {
  it("maps every app and turns a status it does not know into unknown", async () => {
    const { client } = await start();

    expect(await client.listAppsRuntime()).toStrictEqual([
      { appName: "web", status: "running", desiredInstances: 1, runningInstances: 1, tasks: [], latestFailure: undefined, collectionError: undefined },
      {
        appName: "api",
        status: "unknown",
        desiredInstances: undefined,
        runningInstances: undefined,
        tasks: [],
        latestFailure: undefined,
        collectionError: "collection failed",
      },
    ]);
  });

  it("names the requirement when CapRover has no runtime endpoint", async () => {
    const routes = buildRoutes();
    routes.delete(`GET ${API}/user/apps/runtime`);
    const { client } = await start(routes);

    await expect(client.listAppsRuntime()).rejects.toThrow("This CapRover version has no runtime endpoint");
  });
});

describe("CaproverClientAdapter.renameApp()", () => {
  it("sends the old and the new name", async () => {
    const { client, mock } = await start();

    await client.renameApp("web", "web-two");

    expect(mock.requests.at(-1)?.body).toStrictEqual({ oldAppName: "web", newAppName: "web-two" });
  });
});

describe("CaproverClientAdapter.startBuild()", () => {
  it("posts to the webhook path it was given", async () => {
    const { client, mock } = await start();

    await client.startBuild("/user/apps/webhooks/triggerbuild?namespace=captain&token=fake-hook");

    expect(mock.requests.at(-1)).toMatchObject({
      method: "POST",
      path: `${API}/user/apps/webhooks/triggerbuild`,
      query: "namespace=captain&token=fake-hook",
    });
  });
});

describe("CaproverClientAdapter.uploadAppArchive()", () => {
  it("uploads the archive as a detached form to the app", async () => {
    const { client, mock } = await start();

    await client.uploadAppArchive("web", new TextEncoder().encode("tar-bytes"));

    const request = mock.requests.at(-1);
    expect(request?.path).toBe(`${API}/user/apps/appData/web`);
    expect(request?.query).toBe("detached=1");
    expect(JSON.stringify(request?.body)).toContain("tar-bytes");
  });
});

describe("CaproverClientAdapter.removeCustomDomain()", () => {
  it("sends the app and the domain", async () => {
    const { client, mock } = await start();

    await client.removeCustomDomain("web", CUSTOM_DOMAIN);

    expect(mock.requests.at(-1)?.body).toStrictEqual({ appName: "web", customDomain: CUSTOM_DOMAIN });
  });
});

describe("CaproverClientAdapter.updateRootDomain()", () => {
  it("sends the domain and the force flag", async () => {
    const { client, mock } = await start();

    await client.updateRootDomain("apps.example.org", true);

    expect(mock.requests.at(-1)?.body).toStrictEqual({ rootDomain: "apps.example.org", force: true });
  });
});

describe("CaproverClientAdapter.enableRootSsl()", () => {
  it("sends the email address", async () => {
    const { client, mock } = await start();

    await client.enableRootSsl(OPS_EMAIL);

    expect(mock.requests.at(-1)?.body).toStrictEqual({ emailAddress: OPS_EMAIL });
  });
});

describe("CaproverClientAdapter.setForceSsl()", () => {
  it("sends the flag", async () => {
    const { client, mock } = await start();

    await client.setForceSsl(true);

    expect(mock.requests.at(-1)?.body).toStrictEqual({ isEnabled: true });
  });
});

describe("CaproverClientAdapter.listProjects()", () => {
  it("maps the id, the name, the description and the parent", async () => {
    const { client } = await start();

    expect(await client.listProjects()).toStrictEqual([
      { projectId: "p-1", name: "shop", description: "The shop", parentProjectId: undefined },
      { projectId: "p-2", name: "blog", description: "The blog", parentProjectId: "p-1" },
    ]);
  });
});

describe("CaproverClientAdapter.createProject()", () => {
  it("registers the project and returns the one CapRover made", async () => {
    const { client, mock } = await start();

    const project = await client.createProject({ name: "ops", description: "Operations", parentProjectId: "p-1" });

    expect(mock.requests.at(-1)?.body).toStrictEqual({ id: "", name: "ops", description: "Operations", parentProjectId: "p-1" });
    expect(project).toStrictEqual({ projectId: "p-new", name: "ops", description: "Operations", parentProjectId: "p-1" });
  });
});

describe("CaproverClientAdapter.updateProject()", () => {
  it("sends the whole project definition", async () => {
    const { client, mock } = await start();

    await client.updateProject({ projectId: "p-1", name: "shop-two", description: "The shop", parentProjectId: undefined });

    expect(mock.requests.at(-1)?.body).toStrictEqual({ projectDefinition: { id: "p-1", name: "shop-two", description: "The shop" } });
  });
});

describe("CaproverClientAdapter.deleteProjects()", () => {
  it("sends the ids", async () => {
    const { client, mock } = await start();

    await client.deleteProjects(["p-2"]);

    expect(mock.requests.at(-1)?.body).toStrictEqual({ projectIds: ["p-2"] });
  });
});

describe("CaproverClientAdapter.getOneClickApp()", () => {
  it("asks with the root domain and keeps the variables", async () => {
    const { client, mock } = await start();

    const template = await client.getOneClickApp("postgres");

    expect(mock.requests.at(-1)?.query).toBe("appName=postgres&baseDomain=example.com");
    expect(template.displayName).toBe("PostgreSQL");
    expect(template.variables).toStrictEqual([
      { variableId: "$$cap_pg_pass", label: "Password", defaultValue: "", description: "The database password" },
      { variableId: "$$cap_appname", label: "App name", defaultValue: undefined, description: undefined },
    ]);
  });
});

describe("CaproverClientAdapter.listOneClickRepos()", () => {
  it("returns the URLs", async () => {
    const { client } = await start();

    expect(await client.listOneClickRepos()).toStrictEqual([OFFICIAL_REPO, EXAMPLE_REPO]);
  });
});

describe("CaproverClientAdapter.addOneClickRepo()", () => {
  it("sends the URL", async () => {
    const { client, mock } = await start();

    await client.addOneClickRepo(EXAMPLE_REPO);

    expect(mock.requests.at(-1)?.body).toStrictEqual({ repositoryUrl: EXAMPLE_REPO });
  });
});

describe("CaproverClientAdapter.deleteOneClickRepo()", () => {
  it("sends the URL", async () => {
    const { client, mock } = await start();

    await client.deleteOneClickRepo(EXAMPLE_REPO);

    expect(mock.requests.at(-1)?.path).toBe(`${API}/user/oneclick/repositories/delete`);
  });
});

describe("CaproverClientAdapter.startOneClickDeploy()", () => {
  it("reads the template first and sends it with the values keyed by variable id", async () => {
    const { client, mock } = await start();

    const jobId = await client.startOneClickDeploy("postgres", [{ variableId: "$$cap_pg_pass", value: "fake-db-pass" }]);

    expect(jobId).toBe("job-1");
    expect(mock.requests.at(-1)?.body).toMatchObject({ templateName: "postgres", values: { $$cap_pg_pass: "fake-db-pass" } });
  });
});

describe("CaproverClientAdapter.getOneClickDeployProgress()", () => {
  it("maps the steps and the error", async () => {
    const { client, mock } = await start();

    expect(await client.getOneClickDeployProgress("job-1")).toStrictEqual({
      steps: ["Creating app", "Deploying"],
      currentStep: 1,
      errorMessage: "image not found",
      successMessage: undefined,
    });
    expect(mock.requests.at(-1)?.query).toBe("jobId=job-1");
  });
});

describe("CaproverClientAdapter.listRegistries()", () => {
  it("keeps the registries and drops the password of each", async () => {
    const { client } = await start();

    const list = await client.listRegistries();

    expect(list.defaultPushRegistryId).toBe("reg-2");
    expect(list.registries.map((registry) => registry.registryType)).toStrictEqual(["REMOTE_REG", "LOCAL_REG"]);
    expect(JSON.stringify(list)).not.toContain("fake-registry-password-77");
  });
});

describe("CaproverClientAdapter.addRegistry()", () => {
  it("sends the login and the address as a remote registry", async () => {
    const { client, mock } = await start();

    await client.addRegistry({
      registryId: "",
      registryUser: "deploy",
      registryPassword: REGISTRY_PASSWORD,
      registryDomain: REGISTRY_HOST,
      registryImagePrefix: "team",
    });

    expect(mock.requests.at(-1)?.body).toStrictEqual({
      id: "",
      registryUser: "deploy",
      registryPassword: REGISTRY_PASSWORD,
      registryDomain: REGISTRY_HOST,
      registryImagePrefix: "team",
      registryType: "REMOTE_REG",
    });
  });
});

describe("CaproverClientAdapter.updateRegistry()", () => {
  it("sends the id with the new login", async () => {
    const { client, mock } = await start();

    await client.updateRegistry({
      registryId: "reg-1",
      registryUser: "deploy",
      registryPassword: REGISTRY_PASSWORD,
      registryDomain: REGISTRY_HOST,
      registryImagePrefix: "",
    });

    expect(mock.requests.at(-1)?.body).toMatchObject({ id: "reg-1", registryUser: "deploy" });
  });
});

describe("CaproverClientAdapter.deleteRegistry()", () => {
  it("sends the id", async () => {
    const { client, mock } = await start();

    await client.deleteRegistry("reg-1");

    expect(mock.requests.at(-1)?.body).toStrictEqual({ registryId: "reg-1" });
  });
});

describe("CaproverClientAdapter.setDefaultPushRegistry()", () => {
  it("sends the id", async () => {
    const { client, mock } = await start();

    await client.setDefaultPushRegistry("reg-1");

    expect(mock.requests.at(-1)?.body).toStrictEqual({ registryId: "reg-1" });
  });
});

describe("CaproverClientAdapter.enableSelfHostedRegistry()", () => {
  it("calls the enable endpoint", async () => {
    const { client, mock } = await start();

    await client.enableSelfHostedRegistry();

    expect(mock.requests.at(-1)?.path).toBe(`${API}/user/system/selfhostregistry/enableregistry`);
  });
});

describe("CaproverClientAdapter.disableSelfHostedRegistry()", () => {
  it("calls the disable endpoint", async () => {
    const { client, mock } = await start();

    await client.disableSelfHostedRegistry();

    expect(mock.requests.at(-1)?.path).toBe(`${API}/user/system/selfhostregistry/disableregistry`);
  });
});

describe("CaproverClientAdapter.listNodes()", () => {
  it("maps the nodes and turns a role it does not know into unknown", async () => {
    const { client } = await start();

    const found = await client.listNodes();

    expect(found.map((node) => [node.hostname, node.nodeRole, node.ipAddress, node.availability])).toStrictEqual([
      ["captain-1", "manager", "10.0.0.1", "active"],
      ["worker-1", "unknown", "10.0.0.2", "drain"],
    ]);
  });
});

describe("CaproverClientAdapter.addNode()", () => {
  it("sends the SSH details with the port as text", async () => {
    const { client, mock } = await start();

    await client.addNode({
      nodeRole: "worker",
      privateKey: "fake-key",
      remoteNodeIpAddress: "10.0.0.2",
      sshPort: "22",
      sshUser: "root",
      captainIpAddress: "10.0.0.1",
    });

    expect(mock.requests.at(-1)?.body).toStrictEqual({
      nodeType: "worker",
      privateKey: "fake-key",
      remoteNodeIpAddress: "10.0.0.2",
      sshPort: "22",
      sshUser: "root",
      captainIpAddress: "10.0.0.1",
    });
  });
});

describe("CaproverClientAdapter.getLoadBalancer()", () => {
  it("renames the counters", async () => {
    const { client } = await start();

    expect(await client.getLoadBalancer()).toStrictEqual({
      activeConnections: 3,
      acceptedConnections: 120,
      handledConnections: 119,
      totalRequests: 250,
      readingConnections: 0,
      writingConnections: 1,
      waitingConnections: 2,
    });
  });
});

describe("CaproverClientAdapter.getDiskUsage()", () => {
  it("maps the disks and turns a severity it does not know into unknown", async () => {
    const { client } = await start();

    const [node] = await client.getDiskUsage();

    expect(node?.disks.map((disk) => [disk.usedBytes, disk.severity])).toStrictEqual([[40000, "warning"], [10000, "unknown"]]);
  });
});

describe("CaproverClientAdapter.listUnusedImages()", () => {
  it("sends the limit and gives an empty tag list for an image without tags", async () => {
    const { client, mock } = await start();

    expect(await client.listUnusedImages(2)).toStrictEqual([
      { imageId: UNUSED_IMAGE_ID, tags: ["old:1", "old:2"] },
      { imageId: "sha256:bbb", tags: [] },
    ]);
    expect(mock.requests.at(-1)?.query).toBe("mostRecentLimit=2");
  });
});

describe("CaproverClientAdapter.deleteImages()", () => {
  it("sends the ids", async () => {
    const { client, mock } = await start();

    await client.deleteImages([UNUSED_IMAGE_ID]);

    expect(mock.requests.at(-1)?.body).toStrictEqual({ imageIds: [UNUSED_IMAGE_ID] });
  });
});

describe("CaproverClientAdapter.getDiskCleanup()", () => {
  it("returns the setting", async () => {
    const { client } = await start();

    expect(await client.getDiskCleanup()).toStrictEqual({ mostRecentLimit: 3, cronSchedule: "0 0 * * *", timezone: "UTC" });
  });
});

describe("CaproverClientAdapter.setDiskCleanup()", () => {
  it("sends the three values", async () => {
    const { client, mock } = await start();

    await client.setDiskCleanup({ mostRecentLimit: 4, cronSchedule: "0 2 * * *", timezone: "UTC" });

    expect(mock.requests.at(-1)?.body).toStrictEqual({ mostRecentLimit: 4, cronSchedule: "0 2 * * *", timezone: "UTC" });
  });
});

describe("CaproverClientAdapter.updateServerVersion()", () => {
  it("sends the version to update to", async () => {
    const { client, mock } = await start();

    await client.updateServerVersion("1.15.0");

    expect(mock.requests.at(-1)?.body).toStrictEqual({ latestVersion: "1.15.0" });
  });
});

describe("CaproverClientAdapter.getNginxConfig()", () => {
  it("says which template is customized and keeps both texts", async () => {
    const { client } = await start();

    expect(await client.getNginxConfig()).toStrictEqual({
      base: { hasCustomValue: false, customValue: "", defaultValue: "base default text" },
      captain: { hasCustomValue: true, customValue: "captain custom text", defaultValue: "captain default text" },
    });
  });
});

describe("CaproverClientAdapter.setNginxConfig()", () => {
  it("sends both custom values", async () => {
    const { client, mock } = await start();

    await client.setNginxConfig("base text", "captain text");

    expect(mock.requests.at(-1)?.body).toStrictEqual({
      baseConfig: { customValue: "base text" },
      captainConfig: { customValue: "captain text" },
    });
  });
});

describe("CaproverClientAdapter.getNetData()", () => {
  it("names the channels that have settings and never returns a secret", async () => {
    const { client } = await start();

    const info = await client.getNetData();

    expect(info).toStrictEqual({ isEnabled: true, netDataUrl: "https://netdata.example.com", configuredChannels: ["smtp"] });
    expect(JSON.stringify(info)).not.toContain("fake-smtp-password-42");
  });
});

describe("CaproverClientAdapter.setNetDataEnabled()", () => {
  it("sends the current settings back with only the flag changed", async () => {
    const { client, mock } = await start();

    await client.setNetDataEnabled(false);

    expect(mock.requests.at(-1)?.body).toMatchObject({
      netDataInfo: { isEnabled: false, data: { smtp: { server: "smtp.example.com", password: "fake-smtp-password-42" } } },
    });
  });
});

describe("CaproverClientAdapter.getGoAccess()", () => {
  it("returns the setting", async () => {
    const { client } = await start();

    expect(await client.getGoAccess()).toStrictEqual({ isEnabled: true, rotationFrequencyCron: "0 0 * * *", logRetentionDays: 10 });
  });
});

describe("CaproverClientAdapter.setGoAccess()", () => {
  it("sends the setting in the shape CapRover wants", async () => {
    const { client, mock } = await start();

    await client.setGoAccess({ isEnabled: true, rotationFrequencyCron: "0 1 * * *", logRetentionDays: 5 });

    expect(mock.requests.at(-1)?.body).toStrictEqual({
      goAccessInfo: { isEnabled: true, data: { rotationFrequencyCron: "0 1 * * *", logRetentionDays: 5 } },
    });
  });
});

describe("CaproverClientAdapter.listGoAccessReports()", () => {
  it("renames the report fields", async () => {
    const { client } = await start();

    expect(await client.listGoAccessReports("web")).toStrictEqual([
      { domainName: "web.example.com", reportName: "web.html", lastModifiedAt: "2026-01-01T00:00:00.000Z", reportUrl: "/goaccess/web.html" },
    ]);
  });
});

describe("CaproverClientAdapter.getTwoFactorStatus()", () => {
  it("returns whether two-factor login is on", async () => {
    const { client } = await start();

    expect(await client.getTwoFactorStatus()).toBe(true);
  });
});

describe("CaproverClientAdapter.setPassword()", () => {
  it("sends the password this adapter logged in with as the old one", async () => {
    const { client, mock } = await start();

    await client.setPassword(NEW_PASSWORD);

    expect(mock.requests.at(-1)?.body).toStrictEqual({ oldPassword: FAKE_PASSWORD, newPassword: NEW_PASSWORD });
  });

  it("logs in again afterwards, because the old password stopped working", async () => {
    const { client, mock } = await start();
    await client.listApps();

    await client.setPassword(NEW_PASSWORD);
    await client.listApps();

    expect(mock.requests.filter((request) => request.path === `${API}/login`)).toHaveLength(2);
  });
});

describe("CaproverClientAdapter.getProState()", () => {
  it("returns the two flags", async () => {
    const { client } = await start();

    expect(await client.getProState()).toStrictEqual({ isFeatureFlagEnabled: true, isSubscribed: false });
  });
});

describe("CaproverClientAdapter.setProApiKey()", () => {
  it("sends the key", async () => {
    const { client, mock } = await start();

    await client.setProApiKey("fake-pro-key");

    expect(mock.requests.at(-1)?.body).toStrictEqual({ apiKey: "fake-pro-key" });
  });
});

describe("CaproverClientAdapter.listProAlerts()", () => {
  it("keeps the event and the kind of action and drops the metadata", async () => {
    const { client } = await start();

    const alerts = await client.listProAlerts();

    expect(alerts).toStrictEqual([{ eventName: "AppBuildFailed", actionName: "email" }]);
    expect(JSON.stringify(alerts)).not.toContain(OPS_EMAIL);
  });
});

describe("CaproverClientAdapter.listThemes()", () => {
  it("keeps the name and whether it is built in, never the CSS", async () => {
    const { client } = await start();

    const found = await client.listThemes();

    expect(found).toStrictEqual([{ themeName: "default", isBuiltIn: true }, { themeName: "night", isBuiltIn: false }]);
  });
});

describe("CaproverClientAdapter.getCurrentTheme()", () => {
  it("returns the name of the theme in use", async () => {
    const { client } = await start();

    expect(await client.getCurrentTheme()).toBe("night");
  });
});

describe("CaproverClientAdapter.setCurrentTheme()", () => {
  it("sends the name", async () => {
    const { client, mock } = await start();

    await client.setCurrentTheme("night");

    expect(mock.requests.at(-1)?.body).toStrictEqual({ themeName: "night" });
  });
});

describe("CaproverClientAdapter.saveTheme()", () => {
  it("sends the old name, the new name and the CSS", async () => {
    const { client, mock } = await start();

    await client.saveTheme({ previousName: "", themeName: "night", content: "body {}" });

    expect(mock.requests.at(-1)?.body).toStrictEqual({ oldName: "", name: "night", content: "body {}" });
  });
});

describe("CaproverClientAdapter.deleteTheme()", () => {
  it("sends the name", async () => {
    const { client, mock } = await start();

    await client.deleteTheme("night");

    expect(mock.requests.at(-1)?.body).toStrictEqual({ themeName: "night" });
  });
});
