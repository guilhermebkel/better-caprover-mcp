const FRAME_HEADER_BYTES = 8;
const SIZE_OFFSET = 4;
const STDERR_STREAM = 2;
const STREAM_TYPES: readonly number[] = [0, 1, STDERR_STREAM];
const PADDING_LENGTH = 3;

export class DockerLogUtil {
  static decodeHex(hex: string): string {
    const bytes = Buffer.from(hex, "hex");
    return DockerLogUtil.hasFrameHeader(bytes) ? DockerLogUtil.joinFrames(bytes) : bytes.toString("utf8");
  }

  private static hasFrameHeader(bytes: Buffer): boolean {
    const first = bytes[0];
    const isStreamType = first !== undefined && STREAM_TYPES.includes(first);
    const hasPadding = bytes.subarray(1, 1 + PADDING_LENGTH).every((byte) => byte === 0);
    return bytes.length >= FRAME_HEADER_BYTES && isStreamType && hasPadding;
  }

  private static joinFrames(bytes: Buffer): string {
    const payloads: string[] = [];
    let offset = 0;
    while (offset + FRAME_HEADER_BYTES <= bytes.length) {
      const start = offset + FRAME_HEADER_BYTES;
      const end = Math.min(start + bytes.readUInt32BE(offset + SIZE_OFFSET), bytes.length);
      payloads.push(bytes.subarray(start, end).toString("utf8"));
      offset = end;
    }
    return payloads.join("");
  }
}
