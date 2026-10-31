import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findDrift, readSdkMethods } from "./sdk-drift.mjs";

const TYPES = [
  "export declare class SimpleAuthenticationProvider {",
  "    onAuthTokenRequested(): Promise<string>;",
  "}",
  "export default class ApiManager {",
  "    constructor(baseDomain: string);",
  "    login(password: string): Promise<void>;",
  "    getAllApps(): Promise<AppDefinitionsResponse>;",
  "}",
].join("\n");

describe("readSdkMethods()", () => {
  it("lists the methods and leaves the constructor out", () => {
    expect(readSdkMethods(TYPES)).toStrictEqual(["login", "getAllApps"]);
  });

  it("finds the methods of the SDK that is installed", () => {
    const methods = readSdkMethods(readFileSync("node_modules/caprover-api/dist/api/ApiManager.d.ts", "utf8"));

    expect(methods).toContain("getAllApps");
    expect(methods).toContain("executeGenericApiCommand");
  });
});

describe("findDrift()", () => {
  const coverage = {
    methods: {
      login: { status: "internal", reason: "The adapter logs in." },
      getAllApps: { status: "operation", operation: "list_apps" },
    },
  };

  it("finds no drift when every method is classified", () => {
    expect(findDrift(["login", "getAllApps"], coverage)).toStrictEqual([]);
  });

  it("names a method of the SDK that nobody classified", () => {
    expect(findDrift(["login", "getAllApps", "wipeEverything"], coverage)).toStrictEqual([
      "The SDK has the method wipeEverything, which is not classified in src/Adapters/CapRover/sdk-coverage.json.",
    ]);
  });

  it("names a classified method the SDK no longer has", () => {
    expect(findDrift(["login"], coverage)).toStrictEqual([
      "src/Adapters/CapRover/sdk-coverage.json lists getAllApps, which the SDK no longer has.",
    ]);
  });

  it("asks for a reason on an excluded method", () => {
    const withoutReason = { methods: { login: { status: "excluded" } } };

    expect(findDrift(["login"], withoutReason)).toStrictEqual(["login is excluded and needs a reason."]);
  });

  it("asks for the operation name on an operation", () => {
    const withoutName = { methods: { login: { status: "operation" } } };

    expect(findDrift(["login"], withoutName)).toStrictEqual(["login is an operation and needs the name of the operation."]);
  });

  it("refuses a status it does not know", () => {
    const unknown = { methods: { login: { status: "done" } } };

    expect(findDrift(["login"], unknown)[0]).toContain("login has the status \"done\"");
  });

  it("finds no drift between the installed SDK and the coverage file", () => {
    const sdkMethods = readSdkMethods(readFileSync("node_modules/caprover-api/dist/api/ApiManager.d.ts", "utf8"));
    const installed = JSON.parse(readFileSync("src/Adapters/CapRover/sdk-coverage.json", "utf8"));

    expect(findDrift(sdkMethods, installed)).toStrictEqual([]);
  });
});
