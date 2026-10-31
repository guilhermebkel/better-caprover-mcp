import type { JsonTypeName, SchemaNode } from "@/Protocols/JsonSchemaProtocol.ts";

const MAX_DEPTH = 8;
const UNKNOWN_TYPE = "unknown" as const;
const JSON_TYPE_NAMES: readonly JsonTypeName[] = ["string", "number", "integer", "boolean", "null", "array", "object"];

export class JsonSchemaTsUtil {
  static buildType(schema: unknown, isDocumented: boolean): string {
    return JsonSchemaTsUtil.buildNodeType(schema, isDocumented, 0);
  }

  private static readNode(value: unknown): SchemaNode | undefined {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : undefined;
  }

  private static buildNodeType(schema: unknown, isDocumented: boolean, depth: number): string {
    const node = JsonSchemaTsUtil.readNode(schema);
    if (node === undefined || depth > MAX_DEPTH) {
      return UNKNOWN_TYPE;
    }
    const literal = JsonSchemaTsUtil.buildLiteralType(node);
    if (literal !== undefined) {
      return literal;
    }
    const unionKey = ["anyOf", "oneOf"].find((key) => Array.isArray(node[key]));
    if (unionKey !== undefined) {
      return JsonSchemaTsUtil.joinTypes(node[unionKey], " | ", isDocumented, depth);
    }
    if (Array.isArray(node.allOf)) {
      return JsonSchemaTsUtil.joinTypes(node.allOf, " & ", isDocumented, depth);
    }
    if (Array.isArray(node.type)) {
      const variants = node.type.map((type: unknown) => ({ ...node, type }));
      return JsonSchemaTsUtil.joinTypes(variants, " | ", isDocumented, depth);
    }
    return JsonSchemaTsUtil.buildTypeByName(node, isDocumented, depth);
  }

  private static buildLiteralType(node: SchemaNode): string | undefined {
    if (Array.isArray(node.enum)) {
      return node.enum.map((value: unknown) => JSON.stringify(value)).join(" | ");
    }
    if ("const" in node) {
      return JSON.stringify(node.const);
    }
    return undefined;
  }

  private static joinTypes(parts: unknown, separator: string, isDocumented: boolean, depth: number): string {
    const list = Array.isArray(parts) ? parts : [];
    const types = list.map((part: unknown) => JsonSchemaTsUtil.buildNodeType(part, isDocumented, depth + 1));
    return types.length === 0 ? UNKNOWN_TYPE : [...new Set(types)].join(separator);
  }

  private static buildTypeByName(node: SchemaNode, isDocumented: boolean, depth: number): string {
    const typeName = JSON_TYPE_NAMES.find((name) => name === node.type);
    if (typeName === undefined) {
      return UNKNOWN_TYPE;
    }
    const typeNameToBuilder: Record<JsonTypeName, () => string> = {
      string: () => "string",
      number: () => "number",
      integer: () => "number",
      boolean: () => "boolean",
      null: () => "null",
      array: () => JsonSchemaTsUtil.buildArrayType(node, isDocumented, depth),
      object: () => JsonSchemaTsUtil.buildObjectType(node, isDocumented, depth),
    };
    return typeNameToBuilder[typeName]();
  }

  private static buildArrayType(node: SchemaNode, isDocumented: boolean, depth: number): string {
    const item = JsonSchemaTsUtil.buildNodeType(node.items, isDocumented, depth + 1);
    return item.includes(" ") ? `Array<${item}>` : `${item}[]`;
  }

  private static buildObjectType(node: SchemaNode, isDocumented: boolean, depth: number): string {
    const properties = JsonSchemaTsUtil.readNode(node.properties) ?? {};
    const required = new Set(Array.isArray(node.required) ? node.required : []);
    const fields = Object.entries(properties).map(([name, property]) => {
      const optionalMark = required.has(name) ? "" : "?";
      const type = JsonSchemaTsUtil.buildNodeType(property, isDocumented, depth + 1);
      const key = /^[A-Za-z_]\w*$/.test(name) ? name : JSON.stringify(name);
      return `${JsonSchemaTsUtil.buildDoc(property, isDocumented)}${key}${optionalMark}: ${type}`;
    });
    const extra = JsonSchemaTsUtil.readNode(node.additionalProperties);
    if (extra !== undefined) {
      fields.push(`[key: string]: ${JsonSchemaTsUtil.buildNodeType(extra, isDocumented, depth + 1)}`);
    }
    if (fields.length === 0) {
      return node.additionalProperties === false ? "Record<string, never>" : "Record<string, unknown>";
    }
    return `{ ${fields.join("; ")} }`;
  }

  private static buildDoc(property: unknown, isDocumented: boolean): string {
    const description = JsonSchemaTsUtil.readNode(property)?.description;
    if (!isDocumented || typeof description !== "string" || description === "") {
      return "";
    }
    return `/** ${description.replaceAll(/\s+/g, " ").replaceAll("*/", "* /")} */ `;
  }
}
