import { describe, expect, it } from "vitest";
import { FingerprintUtil } from "@/Utils/FingerprintUtil.ts";

describe("FingerprintUtil.build()", () => {
  it("gives the same fingerprint whatever the order of the keys", () => {
    expect(FingerprintUtil.build("delete_app", { app_name: "web", delete_volumes: true })).toBe(
      FingerprintUtil.build("delete_app", { delete_volumes: true, app_name: "web" }),
    );
  });

  it("ignores the confirmation fields", () => {
    const preview = { app_name: "web" };
    const confirmed = { app_name: "web", user_confirmed: true, confirmation_token: "abc", dry_run: false };

    expect(FingerprintUtil.build("delete_app", confirmed)).toBe(FingerprintUtil.build("delete_app", preview));
  });

  it("changes when a real input changes", () => {
    expect(FingerprintUtil.build("delete_app", { app_name: "web" })).not.toBe(
      FingerprintUtil.build("delete_app", { app_name: "api" }),
    );
  });

  it("changes with the operation name", () => {
    expect(FingerprintUtil.build("delete_app", { app_name: "web" })).not.toBe(
      FingerprintUtil.build("scale_app", { app_name: "web" }),
    );
  });
});
