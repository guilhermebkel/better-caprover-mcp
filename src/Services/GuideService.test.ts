import { describe, expect, it } from "vitest";
import { InvalidDotenvError } from "@/Errors/InvalidDotenvError.ts";
import { GuideService } from "@/Services/GuideService.ts";
import { PolicyService } from "@/Services/PolicyService.ts";

const TOPIC_POINTER = /Topic: read `([a-z-]+)` with `get_guide`/;

const readThrownMessage = (call: () => void): string => {
  try {
    call();
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "";
  }
};

describe("GuideService.readTopic()", () => {
  it.each(GuideService.listTopics())("serves the topic %s with a purpose line and a BAD example", (topic) => {
    const text = GuideService.readTopic(topic);

    expect(text.startsWith(`# ${topic}\n\nPurpose:`)).toBe(true);
    expect(text).toContain("BAD:");
  });
});

describe("GuideService.findTopic()", () => {
  it("finds a topic by its name", () => {
    expect(GuideService.findTopic("env-vars")).toBe("env-vars");
  });

  it("finds nothing for a name that is not a topic", () => {
    expect(GuideService.findTopic("pizza")).toBeUndefined();
  });
});

describe("GuideService.listTopics()", () => {
  it("lists the six topics of the standard", () => {
    expect(GuideService.listTopics()).toStrictEqual(["modes", "code-mode", "app-definition", "env-vars", "deploy", "errors"]);
  });

  it("holds every topic that an error of this server points to", () => {
    const policy = new PolicyService("readonly", false);
    const denial = readThrownMessage(() => {
      policy.assertCanRun("create_app", "write");
    });
    const dotenv = new InvalidDotenvError(1, "expected KEY=value.", "BAD").message;

    const topics = [denial, dotenv].map((message) => TOPIC_POINTER.exec(message)?.[1] ?? "none");

    expect(topics).toStrictEqual(["modes", "env-vars"]);
    expect(topics.map((topic) => GuideService.findTopic(topic))).toStrictEqual(["modes", "env-vars"]);
  });
});
