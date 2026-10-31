import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import appDefinitions from "@/Testing/fixtures/appDefinitions.json" with { type: "json" };
import login from "@/Testing/fixtures/login.json" with { type: "json" };
import systemInfo from "@/Testing/fixtures/systemInfo.json" with { type: "json" };
import tokenInvalid from "@/Testing/fixtures/tokenInvalid.json" with { type: "json" };
import versionInfo from "@/Testing/fixtures/versionInfo.json" with { type: "json" };
import wrongPassword from "@/Testing/fixtures/wrongPassword.json" with { type: "json" };
import { MockCaproverServer } from "@/Testing/MockCaproverServer.ts";
import { InitRunner } from "@/Setup/InitRunner.ts";

const FAKE_PASSWORD = "fake-password-9876";

describe("InitRunner.run()", () => {
  let server: MockCaproverServer | undefined;
  let written: string[] = [];

  beforeEach(() => {
    written = [];
    vi.spyOn(process.stderr, "write").mockImplementation((text) => {
      written.push(String(text));
      return true;
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await server?.stop();
    server = undefined;
  });

  const startServer = async (loginReply: object): Promise<string> => {
    server = new MockCaproverServer(new Map([
      ["TOKEN_INVALID", JSON.stringify(tokenInvalid)],
      ["POST /api/v2/login", JSON.stringify(loginReply)],
      ["GET /api/v2/user/system/info", JSON.stringify(systemInfo)],
      ["GET /api/v2/user/system/versioninfo", JSON.stringify(versionInfo)],
      ["GET /api/v2/user/apps/appDefinitions", JSON.stringify(appDefinitions)],
    ]));
    return server.start();
  };

  it("says the login was not tested when the address and password are missing", async () => {
    vi.stubEnv("CAPROVER_URL", "");
    vi.stubEnv("CAPROVER_PASSWORD", "");

    await InitRunner.run();

    expect(written[0]).toContain("CAPROVER_URL and CAPROVER_PASSWORD are not set, so the login was not tested.");
  });

  it("reports the version and the number of apps when the login works", async () => {
    vi.stubEnv("CAPROVER_URL", await startServer(login));
    vi.stubEnv("CAPROVER_PASSWORD", FAKE_PASSWORD);

    await InitRunner.run();

    expect(written[0]).toBe("Login worked: CapRover 1.14.1 at example.com, 2 apps.\n");
  });

  it("reports the reason when the login fails", async () => {
    vi.stubEnv("CAPROVER_URL", await startServer(wrongPassword));
    vi.stubEnv("CAPROVER_PASSWORD", FAKE_PASSWORD);

    await InitRunner.run();

    expect(written[0]).toBe("Login failed: CapRover rejected the password. Tell the person to check CAPROVER_PASSWORD.\n");
  });

  it("prints a config for npx and one for Docker, without the real password", async () => {
    vi.stubEnv("CAPROVER_URL", await startServer(login));
    vi.stubEnv("CAPROVER_PASSWORD", FAKE_PASSWORD);

    await InitRunner.run();

    const output = written.join("");
    expect(output).toContain("\"command\": \"npx\"");
    expect(output).toContain("\"command\": \"docker\"");
    expect(output).toContain("ghcr.io/guilhermebkel/better-caprover-mcp");
    expect(output).not.toContain(FAKE_PASSWORD);
  });
});
