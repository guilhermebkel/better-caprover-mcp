import { describe, expect, it } from "vitest";
import { JsonSchemaTsUtil } from "@/Utils/JsonSchemaTsUtil.ts";

describe("JsonSchemaTsUtil.buildType()", () => {
  it("writes an object with its optional fields marked", () => {
    const schema = {
      type: "object",
      properties: { app_name: { type: "string" }, replicas: { type: "integer" } },
      required: ["app_name"],
    };

    expect(JsonSchemaTsUtil.buildType(schema, false)).toBe("{ app_name: string; replicas?: number }");
  });

  it("writes enums, arrays, unions and nullable values", () => {
    const schema = {
      type: "object",
      properties: {
        mode: { enum: ["a", "b"] },
        tags: { type: "array", items: { type: "string" } },
        either: { anyOf: [{ type: "string" }, { type: "number" }] },
        maybe: { type: ["string", "null"] },
        pairs: { type: "array", items: { anyOf: [{ type: "string" }, { type: "boolean" }] } },
      },
      required: ["mode", "tags", "either", "maybe", "pairs"],
    };

    expect(JsonSchemaTsUtil.buildType(schema, false)).toBe(
      "{ mode: \"a\" | \"b\"; tags: string[]; either: string | number; maybe: string | null; pairs: Array<string | boolean> }",
    );
  });

  it("writes a map and an object without fields", () => {
    expect(JsonSchemaTsUtil.buildType({ type: "object", additionalProperties: { type: "string" } }, false)).toBe("{ [key: string]: string }");
    expect(JsonSchemaTsUtil.buildType({ type: "object", properties: {}, additionalProperties: false }, false)).toBe("Record<string, never>");
  });

  it("keeps the field descriptions as comments only when asked", () => {
    const schema = { type: "object", properties: { app_name: { type: "string", description: "The app,\n use */ never." } }, required: ["app_name"] };

    expect(JsonSchemaTsUtil.buildType(schema, true)).toBe("{ /** The app, use * / never. */ app_name: string }");
    expect(JsonSchemaTsUtil.buildType(schema, false)).toBe("{ app_name: string }");
  });

  it("answers unknown for what it cannot write", () => {
    expect(JsonSchemaTsUtil.buildType({}, false)).toBe("unknown");
    expect(JsonSchemaTsUtil.buildType("text", false)).toBe("unknown");
  });
});
