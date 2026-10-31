import appDefinitions from "@/Adapters/CapRover/fixtures/appDefinitions.json" with { type: "json" };
import emptyOk from "@/Adapters/CapRover/fixtures/emptyOk.json" with { type: "json" };
import login from "@/Adapters/CapRover/fixtures/login.json" with { type: "json" };
import systemInfo from "@/Adapters/CapRover/fixtures/systemInfo.json" with { type: "json" };
import versionInfo from "@/Adapters/CapRover/fixtures/versionInfo.json" with { type: "json" };

const API = "/api/v2";

const reply = (fixture: object): string => JSON.stringify(fixture);

export const buildDefaultMockRoutes = (): Map<string, string> => new Map([
  [`POST ${API}/login`, reply(login)],
  [`GET ${API}/user/system/info`, reply(systemInfo)],
  [`GET ${API}/user/system/versioninfo`, reply(versionInfo)],
  [`GET ${API}/user/apps/appDefinitions`, reply(appDefinitions)],
  [`PATCH ${API}/user/apps/appDefinitions/update`, reply(emptyOk)],
]);
