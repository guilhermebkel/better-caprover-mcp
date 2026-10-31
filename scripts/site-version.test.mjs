import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applySiteVersion, applySitemapDate, formatLongDate } from "./site-version.mjs";

const NOW = new Date("2026-12-03T10:00:00Z");
const HTML = [
  "<p>MIT license. Version 0.1.0, page updated <time datetime=\"2026-10-31\">October 31, 2026</time>.</p>",
  "\"softwareVersion\": \"0.1.0\",",
  "\"dateModified\": \"2026-10-31\"",
].join("\n");

describe("applySiteVersion()", () => {
  it("sets the version and the date in the footer and in the structured data", () => {
    const updated = applySiteVersion(HTML, "0.2.0", NOW);

    expect(updated).toBe([
      "<p>MIT license. Version 0.2.0, page updated <time datetime=\"2026-12-03\">December 3, 2026</time>.</p>",
      "\"softwareVersion\": \"0.2.0\",",
      "\"dateModified\": \"2026-12-03\"",
    ].join("\n"));
  });

  it("fails loudly when the page lost the footer", () => {
    expect(() => applySiteVersion("<p>no footer</p>", "0.2.0", NOW)).toThrow(
      "site/index.html has no version footer, softwareVersion or dateModified to update",
    );
  });

  it("works on the real page", () => {
    const page = readFileSync("site/index.html", "utf8");

    const updated = applySiteVersion(page, "9.9.9", NOW);

    expect(updated).toContain("Version 9.9.9, page updated");
  });
});

describe("applySitemapDate()", () => {
  it("sets the last modified date", () => {
    const updated = applySitemapDate("<url><lastmod>2026-10-31</lastmod></url>", NOW);

    expect(updated).toBe("<url><lastmod>2026-12-03</lastmod></url>");
  });

  it("fails loudly when the sitemap has no date", () => {
    expect(() => applySitemapDate("<url></url>", NOW)).toThrow("site/sitemap.xml has no lastmod to update");
  });
});

describe("formatLongDate()", () => {
  it("writes the month in English and uses the UTC day", () => {
    const late = new Date("2026-01-01T23:30:00Z");

    expect(formatLongDate(late)).toBe("January 1, 2026");
  });
});
