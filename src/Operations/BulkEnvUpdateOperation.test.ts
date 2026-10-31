import { describe, expect, it } from "vitest";
import type { FakeCaproverOptions } from "@/Protocols/FakeCaproverClientProtocol.ts";
import { BulkEnvUpdateOperation } from "@/Operations/BulkEnvUpdateOperation.ts";
import { AppResolverService } from "@/Services/AppResolverService.ts";
import { FakeCaproverClientAdapter } from "@/Testing/FakeCaproverClientAdapter.ts";

const SET_B_CALL = "setEnvVars:b:LEVEL";
const LEVEL_INFO = "LEVEL=info";
const KEEP_AND_LEVEL_KEYS_OF_A = "setEnvVars:a:KEEP,LEVEL";
const PLANTED_ENV_VALUE = "planted-env-value-4321";

const buildApps = (): ReturnType<typeof FakeCaproverClientAdapter.buildApp>[] => [
  FakeCaproverClientAdapter.buildApp({ appName: "a", envVars: [{ key: "LEVEL", value: "debug" }, { key: "KEEP", value: "x" }] }),
  FakeCaproverClientAdapter.buildApp({ appName: "b" }),
  FakeCaproverClientAdapter.buildApp({ appName: "c", envVars: [{ key: "OLD", value: PLANTED_ENV_VALUE }] }),
];

type Setup = {
  fake: FakeCaproverClientAdapter;
  operation: BulkEnvUpdateOperation;
};

const build = (options: FakeCaproverOptions = {}): Setup => {
  const fake = new FakeCaproverClientAdapter(buildApps(), options);
  return { fake, operation: new BulkEnvUpdateOperation(fake, new AppResolverService(fake)) };
};

describe("BulkEnvUpdateOperation.execute()", () => {
  it("sets the same variables on every app in the order given and keeps the other variables", async () => {
    const { fake, operation } = build();

    const result = await operation.execute({ app_names: ["c", "a", "b"], env_vars: LEVEL_INFO, remove_keys: ["OLD"] });

    expect(fake.calls.filter((call) => call.startsWith("setEnvVars"))).toStrictEqual([
      "setEnvVars:c:LEVEL",
      KEEP_AND_LEVEL_KEYS_OF_A,
      SET_B_CALL,
    ]);
    expect(result.data.applied).toStrictEqual(["c", "a", "b"]);
    expect(result.data.notApplied).toStrictEqual([]);
    expect(result.isError).toBeUndefined();
  });

  it("returns the apps before the failing one as applied and the rest as notApplied", async () => {
    const { fake, operation } = build({ failureMessage: "CapRover refused", failOnCall: SET_B_CALL });

    const result = await operation.execute({ app_names: ["a", "b", "c"], env_vars: LEVEL_INFO });

    expect(result.isError).toBe(true);
    expect(result.data.applied).toStrictEqual(["a"]);
    expect(result.data.notApplied).toStrictEqual(["b", "c"]);
    expect(result.data.failure).toBe("CapRover refused");
    expect(fake.calls.filter((call) => call.startsWith("setEnvVars"))).toStrictEqual([KEEP_AND_LEVEL_KEYS_OF_A, SET_B_CALL]);
  });

  it("writes nothing when one app does not exist", async () => {
    const { fake, operation } = build();

    await expect(operation.execute({ app_names: ["a", "zz"], env_vars: LEVEL_INFO })).rejects.toThrow("App \"zz\" does not exist.");
    expect(fake.calls.filter((call) => call.startsWith("setEnvVars"))).toStrictEqual([]);
  });

  it("never returns the value of a variable", async () => {
    const { operation } = build();

    const result = await operation.execute({ app_names: ["c"], env_vars: "NEW=planted-new-value-9", remove_keys: ["OLD"] });

    const text = JSON.stringify(result);
    expect(text).toContain("NEW");
    expect(text).not.toContain(PLANTED_ENV_VALUE);
    expect(text).not.toContain("planted-new-value-9");
  });
});

describe("BulkEnvUpdateOperation.describeChange()", () => {
  it("lists the keys it would change per app and makes no write call", async () => {
    const { fake, operation } = build();

    const result = await operation.describeChange({ app_names: ["a", "b"], env_vars: "LEVEL=info\nMODE=x" });

    expect(result.data.plans).toStrictEqual([
      { appName: "a", addedKeys: ["MODE"], updatedKeys: ["LEVEL"], removedKeys: [] },
      { appName: "b", addedKeys: ["LEVEL", "MODE"], updatedKeys: [], removedKeys: [] },
    ]);
    expect(fake.calls).toStrictEqual(["listApps"]);
  });
});
