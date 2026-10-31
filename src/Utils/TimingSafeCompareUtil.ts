import { createHash, timingSafeEqual } from "node:crypto";

export class TimingSafeCompareUtil {
  static isSecretMatching(candidate: string, expected: string): boolean {
    const candidateDigest = TimingSafeCompareUtil.buildSha256Digest(candidate);
    const expectedDigest = TimingSafeCompareUtil.buildSha256Digest(expected);
    return timingSafeEqual(candidateDigest, expectedDigest);
  }

  static isAnySecretMatching(candidate: string, expectedSecrets: readonly string[]): boolean {
    if (expectedSecrets.length === 0) {
      return false;
    }
    let isMatched = false;
    for (const expected of expectedSecrets) {
      if (TimingSafeCompareUtil.isSecretMatching(candidate, expected)) {
        isMatched = true;
      }
    }
    return isMatched;
  }

  private static buildSha256Digest(value: string): Buffer {
    return createHash("sha256").update(value, "utf8").digest();
  }
}
