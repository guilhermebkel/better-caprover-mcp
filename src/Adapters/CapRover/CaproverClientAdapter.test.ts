import { afterEach, describe, expect, it, vi } from "vitest";
import appAlreadyExists from "@/Adapters/CapRover/fixtures/appAlreadyExists.json" with { type: "json" };
import appDefinitions from "@/Adapters/CapRover/fixtures/appDefinitions.json" with { type: "json" };
import appLogs from "@/Adapters/CapRover/fixtures/appLogs.json" with { type: "json" };
import appRuntime from "@/Adapters/CapRover/fixtures/appRuntime.json" with { type: "json" };
import buildLogs from "@/Adapters/CapRover/fixtures/buildLogs.json" with { type: "json" };
import emptyOk from "@/Adapters/CapRover/fixtures/emptyOk.json" with { type: "json" };
import genericError from "@/Adapters/CapRover/fixtures/genericError.json" with { type: "json" };
import login from "@/Adapters/CapRover/fixtures/login.json" with { type: "json" };
import oneClickApps from "@/Adapters/CapRover/fixtures/oneClickApps.json" with { type: "json" };
import otpRequired from "@/Adapters/CapRover/fixtures/otpRequired.json" with { type: "json" };
import systemInfo from "@/Adapters/CapRover/fixtures/systemInfo.json" with { type: "json" };
import tokenInvalid from "@/Adapters/CapRover/fixtures/tokenInvalid.json" with { type: "json" };
import versionInfo from "@/Adapters/CapRover/fixtures/versionInfo.json" with { type: "json" };
import recordedSystemInfo from "@/Adapters/CapRover/fixtures/recordedSystemInfo.json" with { type: "json" };
import recordedVersionInfo from "@/Adapters/CapRover/fixtures/recordedVersionInfo.json" with { type: "json" };
import recordedWrongPassword from "@/Adapters/CapRover/fixtures/recordedWrongPassword.json" with { type: "json" };
import wrongPassword from "@/Adapters/CapRover/fixtures/wrongPassword.json" with { type: "json" };
import { CaproverClientAdapter } from "@/Adapters/CapRover/CaproverClientAdapter.ts";
import { MockCaproverServer } from "@/Adapters/CapRover/MockCaproverServer.ts";
import { CaproverConfigError } from "@/Errors/CaproverConfigError.ts";
import { CaproverRequestError } from "@/Errors/CaproverRequestError.ts";
import { EnvUtil } from "@/Utils/EnvUtil.ts";

const FAKE_PASSWORD = "fake-password-9876";
const API = "/api/v2";
const CUSTOM_DOMAIN = "www.example.org";
const VOLUME_NAME = "web-data";
const IMAGE_NAME = "nginx:1.27";
const FAKE_ENV_VALUE = "fake-env-value-123";

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
