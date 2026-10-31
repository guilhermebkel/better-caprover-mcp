import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SITE_PATH = "site/index.html";
const SITEMAP_PATH = "site/sitemap.xml";
const ISO_DATE_LENGTH = 10;
const FOOTER = /Version [^,<]*, page updated <time datetime="[^"]*">[^<]*<\/time>/;
const SOFTWARE_VERSION = /"softwareVersion": "[^"]*"/;
const DATE_MODIFIED = /"dateModified": "[^"]*"/;
const LAST_MODIFIED = /<lastmod>[^<]*<\/lastmod>/;

export const formatLongDate = (now) => now.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export const applySiteVersion = (html, version, now) => {
  const missing = [FOOTER, SOFTWARE_VERSION, DATE_MODIFIED].filter((pattern) => !pattern.test(html));
  if (missing.length > 0) {
    throw new Error("site/index.html has no version footer, softwareVersion or dateModified to update");
  }
  const isoDate = now.toISOString().slice(0, ISO_DATE_LENGTH);
  const footer = `Version ${version}, page updated <time datetime="${isoDate}">${formatLongDate(now)}</time>`;
  return html
    .replace(FOOTER, footer)
    .replace(SOFTWARE_VERSION, `"softwareVersion": "${version}"`)
    .replace(DATE_MODIFIED, `"dateModified": "${isoDate}"`);
};

export const applySitemapDate = (sitemap, now) => {
  if (!LAST_MODIFIED.test(sitemap)) {
    throw new Error("site/sitemap.xml has no lastmod to update");
  }
  return sitemap.replace(LAST_MODIFIED, `<lastmod>${now.toISOString().slice(0, ISO_DATE_LENGTH)}</lastmod>`);
};

const updateSite = () => {
  const [, , version] = process.argv;
  if (!version) {
    throw new Error("Usage: node scripts/site-version.mjs <version>");
  }
  const now = new Date();
  const html = readFileSync(SITE_PATH, "utf8");
  const sitemap = readFileSync(SITEMAP_PATH, "utf8");
  const updatedHtml = applySiteVersion(html, version, now);
  const updatedSitemap = applySitemapDate(sitemap, now);
  writeFileSync(SITE_PATH, updatedHtml);
  writeFileSync(SITEMAP_PATH, updatedSitemap);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateSite();
}
