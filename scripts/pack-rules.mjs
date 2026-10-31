export const MAX_PACK_BYTES = 5_242_880;
const ALLOWED_PREFIXES = ["dist/"];
const ALLOWED_FILES = new Set(["package.json", "LICENSE", "README.md", "CHANGELOG.md"]);
const REQUIRED_FILES = ["dist/main.js", "package.json", "LICENSE", "README.md"];

export const findPackProblems = (paths, sizeBytes) => {
  const problems = [];
  if (sizeBytes > MAX_PACK_BYTES) {
    problems.push(`The package is ${sizeBytes} bytes; the limit is ${MAX_PACK_BYTES}.`);
  }
  const isAllowed = (path) => ALLOWED_FILES.has(path) || ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
  for (const path of paths.filter((candidate) => !isAllowed(candidate))) {
    problems.push(`Unexpected file in the package: ${path}`);
  }
  for (const required of REQUIRED_FILES.filter((file) => !paths.includes(file))) {
    problems.push(`The package lacks ${required}.`);
  }
  return problems;
};

export const findManifestWarnings = (stderr) => (
  stderr.includes("auto-corrected") ? ["npm auto-corrected package.json; run `npm pkg fix` and commit the result."] : []
);
