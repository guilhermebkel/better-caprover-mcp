export class ClosestNameUtil {
  static find(name: string, candidates: readonly string[], limit: number): string[] {
    const target = name.toLowerCase();
    return candidates
      .map((candidate) => ({ candidate, distance: ClosestNameUtil.measureDistance(target, candidate.toLowerCase()) }))
      .toSorted((first, second) => first.distance - second.distance || first.candidate.localeCompare(second.candidate))
      .slice(0, limit)
      .map((entry) => entry.candidate);
  }

  private static measureDistance(first: string, second: string): number {
    let previousRow = Array.from({ length: second.length + 1 }, (_, index) => index);
    for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
      const row = [firstIndex];
      for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
        const cost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
        const above = previousRow[secondIndex] ?? 0;
        const left = row[secondIndex - 1] ?? 0;
        const diagonal = previousRow[secondIndex - 1] ?? 0;
        const best = Math.min(above + 1, left + 1, diagonal + cost);
        row.push(best);
      }
      previousRow = row;
    }
    return previousRow[second.length] ?? 0;
  }
}
