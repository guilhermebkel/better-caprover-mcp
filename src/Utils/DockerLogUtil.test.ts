import { describe, expect, it } from "vitest";
import recordedLogsHex from "@/Testing/fixtures/recordedLogsHex.json" with { type: "json" };
import { DockerLogUtil } from "@/Utils/DockerLogUtil.ts";

const buildFrame = (streamType: number, text: string): string => {
  const payload = Buffer.from(text, "utf8");
  const header = Buffer.alloc(8);
  header.writeUInt8(streamType, 0);
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]).toString("hex");
};

describe("DockerLogUtil.decodeHex()", () => {
  it("decodes the log CapRover returned for a real app", () => {
    expect(DockerLogUtil.decodeHex(recordedLogsHex.data.logs)).toBe("2026-10-31T13:04:31.962983269Z /\n");
  });

  it("joins the frames of the output and error streams in order", () => {
    const hex = buildFrame(1, "out line\n") + buildFrame(2, "error line\n");

    expect(DockerLogUtil.decodeHex(hex)).toBe("out line\nerror line\n");
  });

  it("keeps a text that has no frame header as it is", () => {
    const hex = Buffer.from("plain tty output\n", "utf8").toString("hex");

    expect(DockerLogUtil.decodeHex(hex)).toBe("plain tty output\n");
  });

  it("returns what it has when the last frame is cut short", () => {
    const hex = buildFrame(1, "complete\n") + buildFrame(1, "cut off here").slice(0, -8);

    expect(DockerLogUtil.decodeHex(hex)).toBe("complete\ncut off ");
  });

  it("returns an empty text for an empty log", () => {
    expect(DockerLogUtil.decodeHex("")).toBe("");
  });
});
